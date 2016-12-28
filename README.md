# homebridge-home-easy
HomeEasy plugin for homebridge: https://github.com/nfarina/homebridge
Note: This plugin communicates with the Elro HE840IP.
Set the correct ip_address in the configuration.

Based on the LightwaveRF plugin for HomeBridge:
https://github.com/rooi/homebridge-home-easy

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-home-easy
3. Update your configuration file. See the sample below.
4. Start homebridge

# Configuration

You can use the username, password and host to configure the plugin automatically using:
Configuration sample:

 ```
"platforms": [
        {
          "platform": "HomeEasy",
          "name": "HomeEasy",
          "ip_address": "192.168.1.123",
          "username": "admin",
          "password": "111111"
        }   
    ]

```

If you want you can specify the devices yourself using the
following syntac:

 ```
"platforms": [
        {
            "platform" : "HomeEasy",
            "name" : "HomeEasy",
            "ip_address": "192.168.1.123",
            "username": "admin",
            "password": "111111",
            "devices": [
                {
                    "roomid": 1,
                    "roomname": "LivingRoom",
                    "devid": 1,
                    "devname": "MyLight",
                    "devtype": "dimmer"
                },
                {
                    "roomid": 1,
                    "roomname": "LivingRoom",
                    "devid": 2,
                    "devname": "MyLight",
                    "devtype": "switch"
                }
            ]
        }
]
```

The following devices are supported:
- Light: "deviceType": "L"
- Dimmable Light: "deviceType": "D"
- Switch: "deviceType": "S"

# How to Determine Room Number:

Log in to HE840IP
View All Rooms
Select the room in question
Show Page Source
Search in Page Source for "All Off" -The Required value is in the data-room_number= attribute of that line

# How to Determine Device Number:

Log in to HE840IP
View All Rooms
Select the room in question
Device Number is usually the order in which the devices are listed, but this does not account for adding and removing devices. This may take some trial and error.
