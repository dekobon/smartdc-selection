/* Script that allows the user to select a package and writes
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

if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (str) {
        return !this.indexOf(str);
    }
}

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

common.parseArguments(Options, ShortOptions, function (parsed) {
    var client = common.newClient(parsed);
    var output = parsed.argv.remain[0];
    var varname = parsed.argv.remain[1];
    var defaultPkg = parsed.argv.remain[2];

    list.on('keypress', function(key, item) {
        switch (key.name) {
            case 'return':
                list.stop();
                fs.open(output, 'a', function(err, data) {
                    if (err) {
                        console.error(err);
                    } else {
                        var line = util.format("%s=\"%s\"\n", varname, item);
                        fs.write(data, line);
                    }
                });
                break;
        }
    });

    var callback = function (err, obj) {
        if (err) {
            if (err.statusCode === 410) {
                console.error('Object is Gone (410)');
            } else {
                printErr(err);
            }

            process.exit(3);
        }

        var sortPackages = function(a, b) {
            return parseInt(a.memory) - parseInt(b.memory);
        };

        if (obj && process.stdout.isTTY) {
            var filtered = obj.filter(function(item) {
                return item.name && item.name.startsWith('t4');
            }).sort(sortPackages);

            if (filtered.length == 0) {
                filtered = obj.sort(sortPackages);
            }

            for (var key in filtered) {
                var item = filtered[key];
                var maxPad = 30;
                var spaces = maxPad - item.name.length;
                var spaceString = spaces > 0 ? Array(spaces).join(' ') : ' ';
                var defaulty = item.name == defaultPkg ? '*' : ' ';

                var display = util.format("%s%s%s [%sM]",
                    defaulty, item.name, spaceString, item.memory);

                list.add(item.id, display);

                // This moves the cursor to the default value
                if (item.name == defaultPkg) {
                    list.select(item.id);
                }

                list.start();
                console.log("Please select a package");
            }
        // detect if we are in a non-interactive terminal and just choose the default
        } else if (obj && !process.stdout.isTTY) {
            for (var key in obj) {
                var item = obj[key];

                if (item.name == defaultPkg) {
                    list.add(item.id, defaultPkg);
                    break;
                }
            }

            list._events.keypress({ name: 'return' }, item.id);
        }
    }

    client.listPackages(callback, 'hello');
}, usageStr);