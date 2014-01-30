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
  var result = process_squence(req.param("sequenceName"));
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
  			process_squence(data);
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
EVENT PROCESSING
*/

//Process an event
//Returns true on success and an error string on any error
function process_squence(sequenceName) {
	console.log("process_squence: Beginning to process sequence: " + sequenceName);
	var sequence = config.sequences[sequenceName];
	if (!sequence) { 
		return console.log("Error: Sequence is not defined in sequence config");
	}

	events = sequence.events;
	if (!events) { 
		return ("Error: No events are defined for this sequence in sequence config");
	}

	console.log("process_squence: Sequence Loaded. Events to proccess: " + JSON.stringify(sequence));
	
	//foreach event...
	for (var i = 0; i<events.length; i++) {
		action = events[i].type;
		if (events[i].type == "play_video") play_video(events[i]);
		if (events[i].type == "push_pusher_message") push_message(events[i]);
		if (events[i].type == "emit_websocket_message") push_message(events[i]);

	}
	return true;
}

function play_video(event) {
	console.log("play_video: Playing Video: " + event.filename);
	omx.pause(); //Stop any currently running videos
	omx.start("media/" + event.filename);
	omx.play();
	return;
}

function push_websocket_message(event) {
	console.log("push_websocket_message: Emiting a websocket Message: " + event.message);
	io.sockets.emit(event.message);
	return;
}
