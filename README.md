show-controller
===============

An opensource show controller for the Raspberry Pi for simple interactive media and mixed reality applications. Modeled loosly after professional show controllers, the goal is to produce a free, easy to use software that allows physical interactions such as button presses to be translated into virtual events and the other way around. 

Responds to events from: 

- HTTP GET Requests
- Websocket messages (Not yet Implmeneted)
- Pusher Events
- GPIO Pins changing state

Can trigger Sequences of actions that involve the following events:

- Playing HD video out the HDMI port
- Sending Pusher messages
- Sending websocket messages (Not yet Implemented)
- GET requests on a given URL (Not yet Implemented)

To Install

1. Install node.js (See http://joshondesign.com/2013/10/23/noderpi for a great tutorial)
2. Install WiringPi (See https://projects.drogon.net/raspberry-pi/wiringpi/download-and-install/)
3. Type "git clone https://github.com/UWMLI/show-controller.git"
4. Type "cd show-controller" 
5. Type "npm install"
6. Type "cp config.example.json config.json"
7. Edit the config.json file with your settings

To Test:

1. Type "node app.js" from within the show_controller directory
2. Navigate to http://YOUR_PI_IP/ from another computer and you should see this readme as well as the config file




