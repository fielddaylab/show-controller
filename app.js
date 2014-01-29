/*
CONFIG SECTION
*/

var sequences = 
{
	"1": 
	{
		"events":
		[
			{
				"type":"play_video",
				"filename":"AA2014-1.mp4"
			},
			{
				"type":"trigger_event",
				"protocol":"websocket",
				"message":"vote"
			}
		]
	},
	"1then2": 
	{
		"events":
		[
			{
				"type":"play_video",
				"filename":"AA2014-1.mp4"
			},
			{
				"type":"play_video",
				"filename":"AA2014-2.mp4"
			}
		]
	},
	"2": 
	{
		"events":
		[
			{
				"type":"play_video",
				"filename":"AA2014-2.mp4"
			}
		]
	},
	"3": 
	{
		"events":
		[
			{
				"type":"play_video",
				"filename":"AA2014-3.mp4"
			}
		]
	},
	"4": 
	{
		"events":
		[
			{
				"type":"play_video",
				"filename":"AA2014-4.mp4"
			}
		]
	}
}

var express = require('express')
  , app = express()  
  , server = require('http').createServer(app)
  , path = require('path')
  , io = require('socket.io').listen(server)
  , spawn = require('child_process').spawn
  , omx = require('omxcontrol')
  , fs = require('fs')
  , PusherClient = require('pusher-node-client').PusherClient
  , PusherServer = require('pusher');
  ;


/*
Load Config From File
*/
var configFile = fs.readFileSync(__dirname + '/config.json');
var config = JSON.parse(configFile);
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
  		response += JSON.stringify(sequences);
  		res.send(response);
	});
});

//Video playback test route
//Any GET Request on http://my.ip/playTestVideo will trigger a test video over HDMI
app.get('/playTestVideo', function (req, res) {
	console.log('Playing Test Media: ' + app.get('config').express.testMediaPath);
	omx.start(app.get('config').express.testMediaPath);
});

//Start Sequence trigger route
//Any GET request on http://my.ip/startSequence/SEQUENCE_NAME_HERE will try and start the sequence
app.get('/startSequence/:sequenceName', function (req, res) {
  var result = process_squence(req.param("sequenceName"));
  if (result == true) res.json({ok:true}); // status 200 is default
  else res.json(500, {error:result}); // status 500
});

//Launch the server
server.listen(app.get('config').express.port, function(){
  console.log('Express server listening on port ' + app.get('config').express.port);
});


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
SETUP PUSHER CLIENT
*/
console.log(config.pusher.id);

pusher_client = new PusherClient
  appId: config.pusher.id
  key: config.pusher.key
  secret: config.pusher.secret

pres = null;
pusher_client.on('connect', function(){
  	pres = pusher_client.subscribe("presence-users", {user_id: "system"})

  	pres.on('success', function(){

		pres.on('pusher_internal:member_removed', function(data){
	    	console.log ("Pusher Event: member_removed");
	  	});

	    pres.on('pusher_internal:member_added', function(data){
	      console.log ("Pusher Event: member_added");
	    });
  	});
});

pusher_client.connect();

/*
SETUP PUSHER SERVER
*/



/*
EVENT PROCESSING
*/

//Process an event
//Returns true on success and an error string on any error
function process_squence(sequenceName) {
	console.log("Beginning to process sequence: " + sequenceName);
	var sequence = sequences[sequenceName];
	if (!sequence) { 
		return console.log("Error: Sequence is not defined in sequence config");
	}

	events = sequence.events;
	if (!events) { 
		return ("Error: No events are defined for this sequence in sequence config");
	}

	console.log("Sequence Loaded. Events to proccess: " + JSON.stringify(sequence));
	
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
	console.log("Playing Video: " + event.filename);
	omx.pause(); //Stop any currently running videos
	omx.start("media/" + event.filename);
	omx.play();
	setTimeout(finish_playing_video, 3000);
	return;
}
function finish_playing_video(){
	return;
}

function push_websocket_message(event) {
	console.log("Emiting a websocket Message: " + event.message);
	io.sockets.emit(event.message);
	return;
}
