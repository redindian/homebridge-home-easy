# DISCLAIMER
This is a work in progress. Currently switches and dimmers are supported including settings percentages. The Elro HE840IP does not support getting status of devices. A future release will include saving dimmer settings and switch status to a file. These settings may not be correct if normal remotes are being used also.

# homebridge-home-easy
HomeEasy plugin for homebridge: https://github.com/nfarina/homebridge

This plugin communicates with the Elro HomeEasy IP-BOX HE840IP transmitter  / home automation gateway:
http://service.smartwares.eu/en-us/product/10.001.58/he840ip-home-easy-ip-control-system.aspx

Based on the LightwaveRF plugin for HomeBridge:
https://github.com/rooi/homebridge-home-easy

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-home-easy
3. Update your configuration file. See the sample below.
4. Start homebridge

# Configuration

You can use the ip_address, username and password to configure the plugin automatically using:

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

If you want you can specify the devices yourself using the following syntax:

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
- Dimmable Light: "devtype": "dimmer"
- Switch: "devtype": "switch"

# How to Determine Room Number:

- Log in to HE840IP
- Show Inspect Element of the room button.
- Search for roomId element to get the room number.

# How to Determine Device Number:

- Log in to HE840IP
- Select Inspect Element of the device button.
- Search for getdeviceid element to get the device id.
