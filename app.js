var express = require('express')
  , app = express()  
  , server = require('http').createServer(app)
  , path = require('path')
  , io = require('socket.io').listen(server)
  , spawn = require('child_process').spawn
  , omx = require('omxcontrol')
  , fs = require('fs')
  , PusherClient = require('pusher-node-client').PusherClient
  , PusherServer = require('pusher')
  , util = require('util')
  , exec = require('child_process').exec
  , Gpio = require('onoff').Gpio;

  ;


/*
Load Config From File
*/
var configFile = fs.readFileSync(__dirname + '/config.json');
var config;
try {
	config = JSON.parse(configFile);
}
catch(e) {
	console.log('Error in config.json, quitting: ' +e); 
	process.exit();
}
console.log('Config Loaded: ' + JSON.stringify(config));

/*
SETUP EXPRESS HTML SERVER
*/
app.set('config', config);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use(omx());

//Root "help" route
//Any GET Request on http://my.ip/ will show the readme and the JSON sequence config
app.get('/', function (req, res) {
	var response = "";
	fs.readFile(__dirname + '/README.md', 'utf8', function (err,readme) {
		if (err) return console.log(err);
  		response = readme.replace('\n',"<br/>");
  		response += "<h1>Events Object</h1>"
  		response += JSON.stringify(config.sequences);
  		res.send(response);
	});
});

//Start Sequence trigger route
//Any GET request on http://my.ip/startSequence/SEQUENCE_NAME_HERE will try and start the sequence
app.get('/startSequence/:sequenceName', function (req, res) {
  console.log('HTTP Event: startSequence: ' + req.param("sequenceName"));
  var result = processSquence(req.param("sequenceName"));
  if (result == true) res.json({ok:true}); // status 200 is default
  else res.json(500, {error:result}); // status 500
});

//Launch the server
server.listen(app.get('config').express.port, function(){
  console.log('Express server listening on port ' + app.get('config').express.port);
});

/*
SETUP PUSHER CLIENT
*/
pusherClient = new PusherClient(config.pusher);

pres = null;
pusherClient.on('connect', function(){
	//Subscribe to the presence channel
	//Presence channel events will show when a user connects or disconnects from this app
  	presenceChannel = pusherClient.subscribe("presence-users", {user_id: "system"})
  	presenceChannel.on('success', function(){
		presenceChannel.on('pusher_internal:member_removed', function(data){
	    	console.log ("Pusher Event: member_removed");
	  	});

	    presenceChannel.on('pusher_internal:member_added', function(data){
	      console.log ("Pusher Event: member_added");
	    });
  	});

  	//Subscribe to this device's channel, specified in the config file
  	appChannel = pusherClient.subscribe(config.pusher.channel)
  	appChannel.on('success', function(){
		appChannel.on('startSequence', function(data){
	    	console.log ("Pusher Event: startSequence: " + data);
  			processSequence(data);
	  	});
  	});
});

pusherClient.connect();

/*
SETUP SOCKET.IO WEBSOCKET SERVER
*/
io.sockets.on('connection', function (client){ 
  client.on('message', function (msg) {
	handle_event(msg);
  }) ;

  client.on('disconnect', function () {
  });
});

/*
SETUP PUSHER SERVER
*/


/*
GPIO SETUP USING ONNOFF
This setup is for a 2 led 2 button version of the wiring diagram found at 
http://blog.oscarliang.net/use-gpio-pins-on-raspberry-pi/
One change is that the diagram there lists pin 15 as GPIO21. On the modern
rPi pin 15 is refered to as GPIO 27
*/ 
var gpioOut1 = new Gpio(17, 'out');
var gpioOut2 = new Gpio(27, 'out'); //GPIO 27 (rPi rev2) = GPIO 21 (rPi rev1)
var gpioIn1 = new Gpio(23, 'in', 'both');
var gpioIn2 = new Gpio(24, 'in', 'both');

gpioIn1.watch(function(err, value) {
    if (err) exit();
    var sequenceToProcess;
    if (value == 1) sequenceToProcess = config.sequenceTriggers.gpioIn1ChangedValueToHigh;
    else if (value == 0) sequenceToProcess = config.sequenceTriggers.gpioIn1ChangedValueToLow;
    console.log("Button Event: Button 1 is now: " + value + " Sequence to Process: " + sequenceToProcess);
  	if (sequenceToProcess != null) processSquence(sequenceToProcess);
});

gpioIn2.watch(function(err, value) {
    if (err) exit();
    var sequenceToProcess;
    if (value == 1) sequenceToProcess = config.sequenceTriggers.gpioIn2ChangedValueToHigh;
    else if (value == 0) sequenceToProcess = config.sequenceTriggers.gpioIn2ChangedValueToLow;
    console.log("Button Event: Button 2 is now: " + value + " Sequence to Process: " + sequenceToProcess);
  	if (sequenceToProcess != null) processSquence(sequenceToProcess);
});

/*
function exit() {
    led.unexport();
    button.unexport();
    process.exit();
}
process.on('SIGINT', exit);
*/


/*
EVENT PROCESSING
*/

//Process an event
//Returns true on success and an error string on any error
function processSquence(sequenceName) {
	console.log("processSquence: Beginning to process sequence: " + sequenceName);
	var sequence = config.sequences[sequenceName];
	if (!sequence) { 
		return console.log("Error: Sequence is not defined in sequence config");
	}

	events = sequence.events;
	if (!events) { 
		return ("Error: No events are defined for this sequence in sequence config");
	}

	console.log("processSquence: Sequence Loaded. Events to proccess: " + JSON.stringify(sequence));
	
	//foreach event...
	for (var i = 0; i<events.length; i++) {
		action = events[i].type;
		if (events[i].type == "playVideo") playVideo(events[i]);
		if (events[i].type == "pushPusherMessage") pushPusherMessage(events[i]);
		if (events[i].type == "pushWebsocketMessage") pushWebsocketMessage(events[i]);
		if (events[i].type == "setGpioOut1High") writeGPIOValue(1, 1);
		if (events[i].type == "setGpioOut1Low") writeGPIOValue(1, 0);
		if (events[i].type == "setGpioOut2High") writeGPIOValue(2, 1);
		if (events[i].type == "setGpioOut2Low") writeGPIOValue(2, 0);


	}
	return true;
}

function playVideo(event) {
	console.log("playVideo: Playing Video: " + event.filename);
	omx.pause(); //Stop any currently running videos
	omx.start("media/" + event.filename);
	omx.play();
	return;
}

function pushPusherMessage(event) {
	console.log("NOT IMPLEMENTED: pushPusherMessage: Pushing a message: " + event.message);
	return;
}

function pushWebsocketMessage(event) {
	console.log("pushWebsocketMessage: Emiting a websocket Message: " + event.message);
	io.sockets.emit(event.message);
	return;
}

function writeGPIOValue(gpioOutNumber, value) {
	if (gpioOutNumber = 1) gpioOut1.writeSync(value);
	else if (gpioOutNumber = 2) gpioOut2.writeSync(value);
}

    
