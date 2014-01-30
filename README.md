show-controller
===============

An opensource show controller for the Raspberry Pi

To Install:
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


Responds to events from: 
-HTTP GET Requests
-Pusher Events

