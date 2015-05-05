# Global Entry Appointment Cancellation Checker #

This allows you to check and set up notifications for Global Entry enrollment appointment cancellations through the [Global Online Enrollment System website](https://goes-app.cbp.dhs.gov/). It uses [PhantomJS](http://phantomjs.org/), a headless browser, to log in and report back the first available open appointment. If one is found sooner than your current appointment, it will notify you by email. It **does not** make any changes to your account or your appointment.

Once setup, you can retrieve the soonest available appointment day with the following command:

	phantomjs [--ssl-protocol=any] ge-cancellation-checker.phantom.js [-v | --verbose]

Similarly, if you only want to check to see if there is a sooner one than already scheduled, run:

	./ge-checker-cron.py

(Note that this will send an email notification to the address in your `config.json` if a new appointment is found.)

## Setup ##

Please be aware that you must first sign up and schedule an enrollment appointment via the [GOES website](https://goes-app.cbp.dhs.gov/) before using this script. This does nothing more than check for the first available appointment as you would do manually through a browser like Chrome or Firefox, yourself. Also note that because this navigates the GOES website like any other browser ane updates to the GOES website may break it.

### Dependencies ###

The following must be installed and available in your `$PATH`:

* [PhantomJS](http://phantomjs.org/)
* Python (2.7)
* [Sendmail](http://en.wikipedia.org/wiki/Sendmail)

**Note:** Many ISP's block port 25, used for email. If you want to set up email notifications for appointment cancellations and your ISP blocks port 25, a good way around this is to [set up Sendmail to send email through Gmail](http://linuxconfig.org/configuring-gmail-as-sendmail-email-relay).

### Configuration ###

To get started, copy `config.json.example` to `config.json`. In your new config, fill out the following settings:

* **current_interview_date_str**: your currently scheduled interview date, in English (e.g., "September 19, 2015"). **Reminder:** This must be updated every time you reschedule your appointment.

* **logfile**: (optional) the full path to a logfile to be used by `ge-checker-cron.py`. New cancellations, unsuccessful checks, and errors are logged in this file, if provided.

* **email_from**: the "from" address for the notification email

* **email_to**: a list of addresses to send the notifiation email to (must be an array)

* **username**: the username to log in with on the GOES website

* **password**: the password to log in with on the GOES website

* **enrollment_location_id**: the value of the enrollment location that you must choose when setting up your appointment. After choosing from the dropdown, find this ID by running this in the console:
    
        document.querySelector('select[name=selectedEnrollmentCenter]').value

* **init_url**: the login page of the GOES website.

Please also ensure you are the only one with access to your `config.json` to protect your username and password.

### Scheduling ###

If you'd like to be notified of cancellations regularly, you can add the `ge-checker-cron.py` to your cron file with the `crontab -e` command. The following runs every half hour:

	*/30 * * * * /path/to/global-entry-cancellation-checker/ge-checker-cron.py >/dev/null 2>&1

Of course, please make sure that [SendMail is working](http://smallbusiness.chron.com/check-sendmail-working-not-linux-49904.html) before trusting this to notify you. If you want to keep a record, be sure to set a logfile path in your `config.json`.

## Contribution ##

If you're interested in contributing, here are a few feature ideas that might improve this:

* Add ability to not send an email when running `go-checker-cron.py` (maybe a `--no-email` flag?)
* Ignored dates: allow the user to provide a list of days for the checker to ignore
* Plugin system: update `ge-checker-cron.py` to allow configuration for running multiple phantom scripts and keeping track of multiple appointment systems (not just a Global Entry cheker - e.g., the DMV).