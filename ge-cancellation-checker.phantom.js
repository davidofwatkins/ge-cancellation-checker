
// CLI usage:
// phantomjs [--ssl-protocol=any] ge-cancellation-checker.phantom.js [-v|--verbose]

var system = require('system');
var fs = require('fs');

var VERBOSE = false;
var loadInProgress = false;

// Calculate path of this file
var PWD = '';
var current_path_arr = system.args[0].split('/');
if (current_path_arr.length == 1) { PWD = '.'; }
else {
    current_path_arr.pop();
    PWD = current_path_arr.join('/');
}



// ...from command
var configFile = PWD + '/config.json'
system.args.forEach(function(val, i) {
    if (val == '-v' || val == '--verbose') { VERBOSE = true; }
    if (val == '--config') {
	if (system.args.length == i) console.log('failed to set config - no option given');
	else {
	    configFile = system.args[i+1];
	}
    }
});


try {
    var settings = JSON.parse(fs.read(configFile));
    if (!settings.username || !settings.username || !settings.init_url || !settings.enrollment_location_id) {
        console.log('Missing username, password, enrollment location ID, and/or initial URL. Exiting...');
        phantom.exit();
    }
}
catch(e) {
    console.log('Could not find ' + configFile);
    phantom.exit();
}


function fireClick(el) {
    var ev = document.createEvent("MouseEvents");
    ev.initEvent("click", true, true);
    el.dispatchEvent(ev);
}

var page = require('webpage').create();
page.settings.userAgent = 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36';

page.onConsoleMessage = function(msg) {
    if (!VERBOSE) { return; }
    console.log(msg);
};

page.onError = function(msg, trace) {
    if (!VERBOSE) { return; }
    console.error('Error on page: ' + msg);
}

page.onCallback = function(query, msg) {
    if (query == 'username') { return settings.username; }
    if (query == 'password') { return settings.password; }
    if (query == 'fireClick') {
        return function() { return fireClick; } // @todo:david DON'T KNOW WHY THIS DOESN'T WORK! :( Just returns [Object object])
    }
    if (query == 'report-interview-time') {
        if (VERBOSE) { console.log('Next available appointment is at: ' + msg); }
        else { console.log(msg); }
        return;
    }
    if (query == 'report-no-interviews') {
        if (VERBOSE) { console.log('No new interviews available. Please try again later.'); }
        else { console.log('None'); }
        return;
    }
    if (query == 'fatal-error') {
        console.log('Fatal error: ' + msg);
        phantom.exit();
    }
    return null;
}

page.onLoadStarted = function() { loadInProgress = true; };
page.onLoadFinished = function() { loadInProgress = false; };

if (VERBOSE) { console.log('Please wait...'); }

page.open(settings.init_url);
var steps = [
    function() { // Log in
        page.evaluate(function() {
            console.log('On GOES login page...');
            document.querySelector('input[name=j_username]').value = window.callPhantom('username');

            /* The GE Login page limits passwords to only 12 characters, but phantomjs can get around
               this limitation, which causes the fatal error "Unable to find terms acceptance button" */
            document.querySelector('input[name=j_password]').value = window.callPhantom('password').substring(0,12);
            document.querySelector('form[action="/goes/security_check"]').submit();
            console.log('Logging in...');
        });
    },
    function() { // Accept terms
        page.evaluate(function() {

	    submitHome();

            console.log('Bypassing human check...');
        });
    },
    function() { // main dashboard
        page.evaluate(function() {

            function fireClick(el) {
                var ev = document.createEvent("MouseEvents");
                ev.initEvent("click", true, true);
                el.dispatchEvent(ev);
            }

            var $manageAptBtn = document.querySelector('.bluebutton[name=manageAptm]');
            if (!$manageAptBtn) {
                return window.callPhantom('fatal-error', 'Unable to find Manage Appointment button');
            }

            fireClick($manageAptBtn);
            console.log('Entering appointment management...');
        });
    },
    function() {
        page.evaluate(function() {

            function fireClick(el) {
                var ev = document.createEvent("MouseEvents");
                ev.initEvent("click", true, true);
                el.dispatchEvent(ev);
            }

            var $rescheduleBtn = document.querySelector('input[name=reschedule]');

            if (!$rescheduleBtn) {
                return window.callPhantom('fatal-error', 'Unable to find reschedule button. Is it after or less than 24 hrs before your appointment?');
            }

            fireClick($rescheduleBtn);
            console.log('Entering rescheduling selection page...');
        });
    },
    function() {
        page.evaluate(function(location_id) {

            function fireClick(el) {
                var ev = document.createEvent("MouseEvents");
                ev.initEvent("click", true, true);
                el.dispatchEvent(ev);
            }

            var elements = document.getElementsByName('selectedEnrollmentCenter');
            for (i = 0; i < elements.length; i++) {
                if (elements[i].value == location_id) {
                    elements[i].checked = true;
                    var location_name = elements[i].title;
                }
            }

            fireClick(document.querySelector('input[name=next]'));

            console.log('Choosing Location: ' + location_name);
        }, settings.enrollment_location_id.toString());
    },
    function() {

        page.evaluate(function() {

            // If there are no more appointments available at all, there will be a message saying so.
            try {
                if (document.querySelector('span.SectionHeader').innerHTML == 'Appointments are Fully Booked') {
                    window.callPhantom('report-no-interviews');
                    return;
                }
            } catch(e) { }

            // We made it! Now we have to scrape the page for the earliest available date
            var date = document.querySelector('.date table tr:first-child td:first-child').innerHTML;
            var month_year = document.querySelector('.date table tr:last-child td:last-child div').innerHTML;

            var full_date = month_year.replace(',', ' ' + date + ',');
            // console.log('');
            window.callPhantom('report-interview-time', full_date)
            // console.log('The next available appointment is on ' + full_date + '.');
        });
    }
];

var i = 0;
interval = setInterval(function() {
    if (loadInProgress) { return; } // not ready yet...
    if (typeof steps[i] != "function") {
        return phantom.exit();
    }

    steps[i]();
    i++;

}, 100);
