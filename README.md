
# Deprecation Notice:

_This tool is no longer functional and is no longer being maintained. Instead, please use @Drewster727's newer and lighter-weight [goes-notify](Drewster727)! For more information, see #41._

# Global Entry Appointment Cancellation Checker #

This allows you to check and set up notifications for Global Entry enrollment appointment cancellations through the [Global Online Enrollment System website](https://goes-app.cbp.dhs.gov/). It uses [PhantomJS](http://phantomjs.org/), a headless browser, to log in and report back the first available open appointment. If one is found sooner than your current appointment, it will notify you by email. It **does not** make any changes to your account or your appointment.

# Before You Begin...

This started as a fun weekend project with the intention of being used only once. While it's proven to be effective for finding an appointment cancellation, it may be worth simply dropping by your nearest Global Entry application center before taking the trouble to set this up. While an appointment is technically required, interviews are typically very short, and many have reported getting their Global Entry approval before the date of their scheduled interview.

# Running the Script

Once setup, you can retrieve the soonest available appointment day with the following command:

```bash
phantomjs [--ssl-protocol=any] ge-cancellation-checker.phantom.js [-v | --verbose]
```

Similarly, if you only want to check to see if there is a sooner one than already scheduled, run:

```bash
./ge-checker-cron.py [--notify-osx] [--no-email] [--use-gmail] [--config CONFIGFILE]
```

(Note that this will send an email notification to the address in your `config.json` if a new appointment is found.)

## Setup ##

Please be aware that you must first sign up and schedule an enrollment appointment via the [GOES website](https://goes-app.cbp.dhs.gov/) before using this script. This does nothing more than check for the first available appointment as you would do manually through a browser like Chrome or Firefox, yourself. Also note that because this navigates the GOES website like any other browser ane updates to the GOES website may break it.

### Dependencies ###

The following must be installed and available in your `$PATH`:

* [PhantomJS](http://phantomjs.org/)
* Python (2.7)
* [Sendmail](http://en.wikipedia.org/wiki/Sendmail)

**Note:** Many ISP's block port 25, used for email. If you want to set up email notifications for appointment cancellations and your ISP blocks port 25, a good way around this is to [set up Sendmail to send email through Gmail](http://linuxconfig.org/configuring-gmail-as-sendmail-email-relay).

### Docker ###

One simple way to run this without installing PhantomJS on your local machine is to use the included DockerFile.

```bash
# If not already cloned:
git clone https://github.com/davidofwatkins/ge-cancellation-checker.git
cd ge-cancellation-checker

# Run Docker
cp config.json.example config.json
# Make your edits to config.json
docker build -t ge-cancellation-checker .
docker run ge-cancellation-checker
```

### Configuration ###

To get started, copy `config.json.example` to `config.json`. In your new config, fill out the following settings:

* **current_interview_date_str**: your currently scheduled interview date, in English (e.g., "September 19, 2015"). **Reminder:** This must be updated every time you reschedule your appointment.

* **logfile**: (optional) relative path to a logfile to be used by `ge-checker-cron.py`. New cancellations, unsuccessful checks, and errors are logged in this file, if provided.

* **email_from**: the "from" address for the notification email

* **email_to**: a list of addresses to send the notifiation email to (must be an array)

* **email_server**: your SMTP server, defaults to localhost

* **email_port**: your SMTP port, defaults to 25, common numbers are 465 for SSL over SMTP

* **email_username** (optional): your SMTP username for authentication 

* **email_password** (optional): your SMTP password for authentication

* **use_gmail** (optional): instead of using sendmail, send the email directly through GMail. This requires the **gmail_password** config. (This can also be enabled with the `--use-gmail` flag.)

* **notify_osx** (optional): if on an OS X machine, notify with system notifications. (This can also be enabled with the `--notify-osx` flag.)

* **username**: the username to log in with on the GOES website

* **password**: the password to log in with on the GOES website

* **enrollment_location_id**: the value of the enrollment location that you must choose when setting up your appointment. After choosing from the dropdown, find this ID by running this in the console:

    ```js
    document.querySelector('select[name=selectedEnrollmentCenter]').value
    ```

* **init_url**: the login page of the GOES website.

* **twilio_account_sid** (optional): the account SID for your Twilio account, if you want to receive SMS notifications. See [the next section](#twilio-sms-notification) for details.

* **twilio_auth_token** (optional): the auth token for your Twilio account, if you want to receive SMS notifications. See [the next section](#twilio-sms-notification) for details.

* **twilio_from_number** (optional): the phone number from which to send SMS notifications. See [the next section](#twilio-sms-notification) for details.

* **twilio_to_number** (optional): the phone number to which to send SMS notifications – this is probably *your* phone number! See [the next section](#twilio-sms-notification) for details.

Please also ensure you are the only one with access to your `config.json` to protect your username and password.

### Twilio SMS Notification ###

If you'd like to receive SMS notifications in addition to or instead of email notifications, you can do so with [Twilio](https://twilio.com). Create an account and a new SMS enabled sending phone number, then fill in `twilio_account_sid`, `twilio_auth_token`, `twilio_from_number`, and `twilio_to_number` in `config.json`. The from and to phone numbers should be formatted like this: `+18005551234`. You'll also need to install the `twilio` Python package, with `pip install twilio`.

### Scheduling ###

If you'd like to be notified of cancellations regularly, you can add the `ge-checker-cron.py` to your cron file with the `crontab -e` command. The following runs every half hour:

```
*/30 * * * * /path/to/global-entry-cancellation-checker/ge-checker-cron.py >/dev/null 2>&1
```

Of course, if using SendMail instead of Gmail (see `use_gmail` above), please make sure that [SendMail is working](http://smallbusiness.chron.com/check-sendmail-working-not-linux-49904.html) before trusting this to notify you. If you want to keep a record, be sure to set a logfile path in your `config.json`.

## Contribution ##

If you're interested in contributing, please take a look at [CONTRIBUTING.md](CONTRIBUTING.md) for welcome improvements and some quick reminders for submitting a pull request. Thanks for the help!
