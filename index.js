// HomeEasy Platform Shim for HomeBridge
//
// Remember to add platform to config.json. Example:
// "platforms": [
//     {
//         "platform": "HomeEasy",
//         "name": "HomeEasy",
//         "ip_address": "192.168.1.123",
//         "username": "admin",
//         "password: "111111"
//     }
// ],
//
// If you do not know the IP address of your HomeEasy HE840IP, use an app like Fing to find it or
// check your router settings.
//
// When you attempt to add a device, it will ask for a "PIN code".
// The default code for all HomeBridge accessories is 031-45-154.
//

/* jslint node: true */
/* globals require: false */
/* globals config: false */

"use strict";

var HE840IP = require("./he840ip");
var fs = require('fs');
var path = require('path');

var Service, Characteristic;

module.exports = function (homebridge) {

    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerPlatform("homebridge-home-easy", "HomeEasy", HomeEasyPlatform);
};

function HomeEasyPlatform(log, config) {
    this.log = log;
    this.ip_address = config["ip_address"];
    this.username = config["username"];
    this.password = config["password"];
    this.devices = config["devices"];

    this.log("HomeEasy Platform Plugin Version " + this.getVersion());
}

function HomeEasyAccessory(log, device, api) {
    this.roomId = device.roomid;
    this.deviceId = device.devid;
    this.name = device.roomname + " " + device.devname;
    this.device = device;
    this.isDimmer = (device.devtype.indexOf('dimmer') > -1);
    this.isLight = this.isDimmer;
    this.isSwitch = (device.devtype.indexOf('switch') > -1);
    this.status = 0; // 0 = off, else on / percentage
    this.previousPercentage = 0;
    this.api = api;
    this.log = log;
    this.timeOut = device.timeOut ? device.timeOut : 2;
}

function onErr(err) {
    console.log(err);
    return 1;
}

HomeEasyPlatform.prototype = {

    accessories: function (callback) {
        this.log("Fetching HomeEasy switches and dimmers...");
        var that = this;
        var getLights = function () {

            var foundAccessories = [];

            // use website
            if (that.username && that.password) {

                var api = new HE840IP({
                    host: that.ip_address,
                    username: that.username,
                    password: that.password
                }, function (devices) {

                    // Use devices from config or all found devices
                    if (that.devices && that.devices.length > 0) {
                        devices = that.devices;
                    }

                    for (var i = 0, l = devices.length; i < l; ++i) {
                        var device = devices[i];
                        console.log("device = ");
                        console.log(device);
                        var accessory = new HomeEasyAccessory(that.log, device, api);
                        foundAccessories.push(accessory);
                    }
                    callback(foundAccessories);
                }.bind(this));
            }
            else {
                onErr("No 'username' or 'password' specified. Defaults are 'admin' and '1111111'");
            }

        };

        getLights();
    },

    getVersion: function () {
        var pjPath = path.join(__dirname, './package.json');
        var pj = JSON.parse(fs.readFileSync(pjPath));
        return pj.version;
    }

};

HomeEasyAccessory.prototype = {
    extractValue: function (characteristic, status) {
        switch (characteristic.toLowerCase()) {
            case 'power':
                return status > 0 ? 1 : 0;
            case 'brightness':
                return status;
            default:
                return null;
        }
    },

    // Create and set a light state
    executeChange: function (characteristic, value, callback) {
        switch (characteristic.toLowerCase()) {
            case 'identify':
                // Turn on twice to let the light blink
                this.api.turnDeviceOn(this.roomId, this.deviceId);

                var that = this;
                setTimeout(function () {
                    that.api.turnDeviceOff(that.roomId, that.deviceId);
                }, 1000);
                setTimeout(function () {
                    that.api.turnDeviceOn(that.roomId, that.deviceId);
                }, 2000);
                setTimeout(function () {
                    that.api.turnDeviceOff(that.roomId, that.deviceId);
                }, 3000);
                if (callback) callback();
                break;
            case 'power':
                if (value > 0) {
                    if (this.isDimmer) {
                        if (this.previousPercentage < 3.125) this.previousPercentage = 100; // Prevent very low last states
                        this.api.setDeviceDim(this.roomId, this.deviceId, this.previousPercentage, callback);
                        //this.status = this.previousPercentage;
                    } else {
                        this.api.turnDeviceOn(this.roomId, this.deviceId);
                        this.status = 100;
                    }
                }
                else {
                    //this.previousPercentage = 0;
                    this.api.turnDeviceOff(this.roomId, this.deviceId);
                    this.status = 0;
                }
                break;
            case 'brightness':
                this.previousPercentage = value;
                // Only write when change is larger than 5
                this.status = value;
                if (value > 0 && this.lightbulbService && !this.lightbulbService.getCharacteristic(Characteristic.On)) {
                    this.lightbulbService.getCharacteristic(Characteristic.On).setValue(true);
                }
                this.api.setDeviceDim(this.roomId, this.deviceId, value);

                break;
        }

        if (typeof callback == 'function') {
            callback();
        }
    },

    // Read light state
    // TODO: implement clever polling/update and caching
    //       maybe a better NodeJS hue API exists for this
    getState: function (characteristic, callback) {
        if (callback == null) {
            return;
        }
        else {
            var newValue = this.extractValue(characteristic, this.status);
            if (newValue != undefined) {
                callback(null, newValue);
            } else {
                this.log("Device " + that.device.name + " does not support reading characteristic " + characteristic);
                //  callback(Error("Device " + that.device.name + " does not support reading characteristic " + characteristic) );
                callback(1, 0);
            }

            callback = null;

            //this.log("Get " + that.device.name + ", characteristic: " + characteristic + ", value: " + value + ".");
        }//.bind(this));
    },

    // Respond to identify request
    identify: function (callback) {
        this.executeChange("identify");
        callback();
    },

    // Get Services
    getServices: function () {
        var that = this;

        this.lightbulbService = 0;
        this.switchService = 0;

        if (this.isLight) {
            // Use HomeKit types defined in HAP node JS
            var lightbulbService = new Service.Lightbulb(this.name);

            // Basic light controls, common to Hue and Hue lux
            lightbulbService
                .getCharacteristic(Characteristic.On)
                .on('get', function (callback) {
                    that.getState("power", callback);
                })
                .on('set', function (value, callback) {
                    that.executeChange("power", value, callback);
                })
                .value = this.extractValue("power", this.status);

            if (this.isDimmer) {
                lightbulbService
                    .addCharacteristic(Characteristic.Brightness)
                    .on('get', function (callback) {
                        that.getState("brightness", callback);
                    })
                    .on('set', function (value, callback) {
                        that.executeChange("brightness", value, callback);
                    })
                    .value = this.extractValue("brightness", this.status);
                lightbulbService.getCharacteristic(Characteristic.Brightness)
                    .setProps({minStep: 1})
            }

            this.lightbulbService = lightbulbService;
        }
        else if (this.isSwitch) {
            // Use HomeKit types defined in HAP node JS
            var switchService = new Service.Switch(this.name);

            // Basic light controls, common to Hue and Hue lux
            switchService
                .getCharacteristic(Characteristic.On)
                .on('get', function (callback) {
                    that.getState("power", callback);
                })
                .on('set', function (value, callback) {
                    that.executeChange("power", value, callback);
                })
                .value = this.extractValue("power", this.status);

            this.switchService = switchService;
        }

        var informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, "HomeEasy")
            .setCharacteristic(Characteristic.Model, "HE840IP")
            .setCharacteristic(Characteristic.SerialNumber, "A1S2NASF88EW" + this.roomId + this.deviceId)//this.device.uniqueid)
            .addCharacteristic(Characteristic.FirmwareRevision, "0.0.1");

        if (this.lightbulbService) return [informationService, this.lightbulbService];
        else if (this.switchService) return [informationService, this.switchService];
        else if (this.openerService) return [informationService, this.openerService];
        else return [informationService];
    }
};
