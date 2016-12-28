"use strict";

var querystring = require('querystring');
var http = require('http');

function HE840IP(config, callback) {

    function addDefaultOptions(options, default_options) {
        for (var option in default_options) {
            if (!options.hasOwnProperty(option)) {
                options[option] = default_options[option];
            }
        }
    }

    function httpPost(options, data, callback) {
        // Build the post string from an object
        data = querystring.stringify(data);

        // An object of options to indicate where to post to
        var default_options = {
            port: '80',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        addDefaultOptions(options, default_options);

        console.log('httpPost', options, data);

        httpRequest(options, data, callback);
    }

    function httpRequest(options, data, callback) {
        // Set up the request
        var request = http.request(options, function (response) {
            // Explicitly treat incoming data as utf8 (avoids issues with multi-byte chars)
            response.setEncoding('utf8');
            // Continuously update stream with data
            var body = '';
            response.on('data', function (chunk) {
                body += chunk;
            });
            response.on('end', function () {
                //console.log('Response: ' + body);
                callback(body);
            });
        }).on('error', function (err) {
            // handle errors with the request itself
            console.error('Error with the request:', err.message);
        });

        // post the data
        request.write(data);
        request.end();
    }

    function login(config, callback) {

        var post_options = {
            host: config.host,
            path: '/cgi-bin/uservalid.cgi'
        };

        var post_data = {
            UserName: config.username,
            UserPassword: config.password
        };

        httpPost(post_options, post_data, function (repsonse) {
            var data = JSON.parse(repsonse);
            if (data && data.result == 200 && data.sessvalid == 100 && data.session) {
                //console.log('success', data.session);
                callback(data);
            } else {
                console.log('error, could not login', repsonse);
            }
        });
    }

    function allroomdevice(config, callback) {

        var post_options = {
            host: config.host,
            path: '/cgi-bin/allroomdevice.cgi'
        };

        var post_data = {
            optype: 'select',
            sessid: config.session
        };

        httpPost(post_options, post_data, function (repsonse) {
            var data = JSON.parse(repsonse);
            if (data && data.result == 200 && data.sessvalid == 100 && data.room) {
                //console.log('success', data.room);
                callback(data);
            } else {
                console.log('error, could not get rooms', repsonse);
            }
        });
    }

    function switchon(config, callback) {
        devicecontrolsingledev(config, 'switch', 'on', callback);
    }

    function switchoff(config, callback) {
        devicecontrolsingledev(config, 'switch', 'off', callback);
    }

    function dimmeron(config, callback) {
        devicecontrolsingledev(config, 'dimmer', 'on', callback);
    }

    function dimmeroff(config, callback) {
        devicecontrolsingledev(config, 'dimmer', 'off', callback);
    }

    function dimmerset(config, callback) {
        var set = config.set;
        if (set) {
            if (set.indexOf('%') == -1 && !isNaN(parseFloat(set))) {
                set += '%';
            }
            devicecontrolsingledev(config, 'dimmer', set, callback);
        }
    }

    function devicecontrolsingledev(config, devtype, controltype, callback) {

        var options = {
            host: config.host,
            path: '/cgi-bin/devicecontrol.cgi'
        };

        var data = {
            optype: 'singledev',
            devtype: devtype,
            controltype: controltype,
            devid: config.devid,
            sessid: config.session
        };

        postDevicecontrol(options, data, callback);
    }

    function postDevicecontrol(options, data, callback) {
        httpPost(options, data, function (repsonse) {
            var data = JSON.parse(repsonse);
            if (data && data.result == 200 && data.sessvalid == 100) {
                console.log('success', data);
                callback(data);
            } else {
                console.log('error, could not control device', repsonse);
            }
        });
    }

    // Expose
    this.host = config.host;
    this.login = login;
    this.session = '';
    this.devices = [];
    this.allroomdevice = allroomdevice;
    this.devicecontrolsingledev = devicecontrolsingledev;
    this.switchon = switchon;
    this.switchoff = switchoff;
    this.dimmeron = dimmeron;
    this.dimmeroff = dimmeroff;
    this.dimmerset = dimmerset;

    var that = this;

    login({
        host: config.host,
        username: config.username,
        password: config.password
    }, function (data) {
        var session = data.session;
        that.session = session;

        allroomdevice({
            host: config.host,
            session: session
        }, function (data) {
            //console.log('rooms success', data.room);
            var rooms = data.room;
            var devices = [];
            var types = ['switchdev', 'dimmer', 'curtain', 'therm', 'transmitter'];
            for (var r = 0, rl = rooms.length; r < rl; r++) {
                var room = rooms[r];
                for (var t = 0, tl = types.length; t < tl; t++) {
                    var type = types[t];
                    if (!room.hasOwnProperty(type)) {
                        console.log('room', room, 'has not type', type);
                        continue;
                    }
                    var values = room[type];
                    if (!Array.isArray(values)) {
                        values = [values];
                    }

                    for (var v = 0, vl = values.length; v < vl; v++) {
                        var value = values[v];
                        addDefaultOptions(value, {
                            devtype: type,
                            roomid: room.roomid,
                            roomname: room.roomname,
                            roomtypeid: room.roomtypeid
                        });
                        devices.push(value);
                    }
                }
            }
            that.devices = devices;
            callback(devices);
        });
    });

    // First version, use LightwaveRF style function calls
    function turnDeviceOn(roomid, deviceid, callback) {
        switchon({
            host: that.host,
            session: that.session,
            devid: deviceid
        }, callback);
    }

    function turnDeviceOff(roomid, deviceid, callback) {
        switchon({
            host: config.host,
            session: that.session,
            devid: deviceid
        }, callback);
    }

    function setDeviceDim(roomid, deviceid, value, callback) {
        dimmerset({
            host: that.host,
            session: that.session,
            devid: deviceid,
            set: value
        }, callback)
    }

    this.turnDeviceOn = turnDeviceOn;
    this.turnDeviceOff = turnDeviceOff;
    this.setDeviceDim = setDeviceDim;
}

module.exports = HE840IP;