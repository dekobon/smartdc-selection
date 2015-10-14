/* Script that allows the user to select a datacenter and writes
 * the selection to a file that can be loaded via the source
 * command. This allows it to be used in combination with bash
 * scripts.
 */

var smartdc = require('smartdc');
var url = require('url');
var List = require('term-list');
var util = require('util');
var fs = require('fs');

var common = require('smartdc/lib/cli_common');

// --- Globals

var Options = {
    'account': String,
    'debug': Boolean,
    'help': Boolean,
    'keyId': String,
    'url': url,
    'version': Boolean,
    'verbose': Boolean,
    'user': String,
    'role': String
};

var ShortOptions = {
    'a': ['--account'],
    'd': ['--debug'],
    'h': ['--help'],
    '?': ['--help'],
    'k': ['--keyId'],
    'u': ['--url'],
    'v': ['--verbose'],
    'A': ['--user']
};

var usageStr = common.buildUsageString(Options);
usageStr += common.buildDetailedUsageString(Options);

var list = new List({ marker: '\033[36m› \033[0m', markerLength: 2 });

/**
 * Common callback for all CLI operations.
 *
 * @param {Error} err optional error object.
 * @param {Object} obj optional response object.
 */
var callback = function (err, obj) {
    if (err) {
        if (err.statusCode === 410) {
            console.error('Object is Gone (410)');
        } else {
            printErr(err);
        }

        process.exit(3);
    }

    if (obj) {
        for (var key in obj) {
            list.add(obj[key], key);
        }
    }

    // Don't allow selection of the datacenter when in non-interactive mode
    if (!process.stdout.isTTY) {
        return;
    }

    if (obj && Object.keys(obj).length > 1) {
        list.start();
        console.log("Please select the data center in which you wish to use");
    // Don't bother asking what DC to use when there is only one
    } else if (obj && Object.keys(obj).length == 1) {
        list._events.keypress({ name: 'return' }, obj[Object.keys(obj)[0]]);
    }
}

common.parseArguments(Options, ShortOptions, function (parsed) {
    var client = common.newClient(parsed);
    var output = parsed.argv.remain[0];

    list.on('keypress', function(key, item) {
        switch (key.name) {
            case 'return':
                list.stop();
                fs.open(output, 'a', function(err, data) {
                    if (err) {
                        console.error(err);
                    } else {
                        var line = util.format("SDC_URL=\"%s\"\n", item);
                        fs.write(data, line);
                    }
                });
                break;
        }
    });

    client.listDatacenters(callback);
}, usageStr);