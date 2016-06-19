#!/usr/bin/python

# Note: for setting up email with sendmail, see: http://linuxconfig.org/configuring-gmail-as-sendmail-email-relay


import argparse
import commands
import json
import logging
import smtplib
import sys

from datetime import datetime
from os import path
from subprocess import check_output


EMAIL_TEMPLATE = """
<p>Good news! There's a new Global Entry appointment available on <b>%s</b> (your current appointment is on %s).</p>
<p>If this sounds good, please sign in to https://goes-app.cbp.dhs.gov/main/goes to reschedule.</p>
<p>If you reschedule, please remember to update CURRENT_INTERVIEW_DATE in your config.json file.</p>
"""


def notify_send_email(settings, current_apt, avail_apt, use_gmail=False):
    sender = settings.get('email_from')
    recipient = settings.get('email_to', sender)  # If recipient isn't provided, send to self.
    password = settings.get('email_password')

    if not password and use_gmail:
        print 'Trying to send from gmail, but password was not provided.'
        return

    try:
        if use_gmail:
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(sender, password)
        else:
            server = smtplib.SMTP('localhost', 25)

        subject = "Alert: New Global Entry Appointment Available"
        headers = "\r\n".join(["from: " + sender,
                               "subject: " + subject,
                               "to: " + recipient,
                               "mime-version: 1.0",
                               "content-type: text/html"])
        message = EMAIL_TEMPLATE % (avail_apt.strftime('%B %d, %Y'), current_apt.strftime('%B %d, %Y'))
        content = headers + "\r\n\r\n" + message

        server.sendmail(sender, recipient, content)
        server.quit()
    except Exception:
        logging.exception('Failed to send succcess e-mail.')


def notify_osx(msg):
    commands.getstatusoutput("osascript -e 'display notification \"%s\" with title \"Global Entry Notifier\"'" % msg)


def main(settings, arguments):
    try:
        # Run the phantom JS script - output will be formatted like 'July 20, 2015'
        script_output = check_output(['phantomjs', '%s/ge-cancellation-checker.phantom.js' % pwd]).strip()
        new_apt = datetime.strptime(script_output, '%B %d, %Y')
    except ValueError:
        logging.exception("Couldn't convert output: {} from phantomJS script into a valid date. ".format(script_output))
        sys.exit()

    current_apt = datetime.strptime(settings['current_interview_date_str'], '%B %d, %Y')
    if new_apt > current_apt:
        logging.info('No new appointments. Next available on %s (current is on %s)' % (new_apt, current_apt))
    else:
        msg = 'Found new appointment on %s (current is on %s)!' % (new_apt, current_apt)
        logging.info(msg + ' Sending E-mail? %s' % (not arguments.no_email))

        if arguments.notify_osx:
            notify_osx(msg)
        if not arguments.no_email:
            notify_send_email(settings, current_apt, new_apt, use_gmail=arguments.use_gmail)


def _check_settings(config):
    required_settings = (
        'current_interview_date_str',
        'email_to',
        'email_from',
        'email_password',
        'init_url',
        'enrollment_location_id',
        'username',
        'password',
    )

    for setting in required_settings:
        if not config.get(setting):
            raise ValueError('Missing setting %s in config.json file.' % setting)

if __name__ == '__main__':
    # Configure Basic Logging
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s %(message)s',
        datefmt='%m/%d/%Y %I:%M:%S %p',
        stream=sys.stdout,
    )

    # Load Settings
    pwd = path.dirname(sys.argv[0])
    try:
        settings_file = '%s/config.json' % pwd
        with open(settings_file) as json_file:
            settings = json.load(json_file)
            _check_settings(settings)
    except Exception as e:
        logging.exception('Error loading settings from config.json file')
        sys.exit()

    # Configure File Logging
    if settings.get('logfile'):
        handler = logging.FileHandler('%s/%s' % (pwd, settings.get('logfile')))
        handler.setFormatter(logging.Formatter('%(asctime)s %(message)s'))
        handler.setLevel(logging.DEBUG)
        logging.getLogger('').addHandler(handler)

    # Parse Arguments
    parser = argparse.ArgumentParser(description="Command line script to check for Global Entry appointment time slots.")
    parser.add_argument('--no-email', action='store_true', dest='no_email', default=False, help='Don\'t send an e-mail when the script runs.')
    parser.add_argument('--use-gmail', action='store_true', dest='use_gmail', default=False, help='Use the gmail SMTP server instead of sendmail.')
    parser.add_argument('--notify-osx', action='store_true', dest='notify_osx', default=False, help='If better date is found, notify on the osx desktop.')
    arguments = parser.parse_args()

    logging.debug('Arguments Provided: %s' % arguments)
    logging.debug('Loading Settings From: %s' % settings_file)
    logging.debug('Logging: %s' % settings.get('logfile', 'No Logging Configured.'))

    main(settings, arguments)
