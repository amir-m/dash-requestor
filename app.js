stackTraceLimit = Infinity;

var cluster = require('cluster'),
	express = require("express"),
	request = require("request"),
	redis = require("redis"),
	redisClient = redis.createClient(6379, '54.185.233.146'),
	models = require("./models").config(redisClient),
	app = express(),
    workers = {},
    cpuCount = require('os').cpus().length;
var forked = false;

app.use(require('morgan')('dev'));
app.set('port', process.env.PORT || 8000);
app.use(require('body-parser')());
app.use(require('method-override')());

app.get('/call', function(req, res){
	
	var uri = req.originalUrl.replace('/call?', '');

	res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    request(uri, function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	    
	    res.send(body);
	    body = null;
	  }
	});
});

app.post('/email', function(req, res){

	res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    console.log(req.param('email'));

    if (!isEmailAddress(req.param('email'))) return res.send(400);
	
	models.Email.findOne(req.body.email, function(error, exist) {
		if (error) {
			return res.send(500);
		}

		if (exist.length > 0) {
			res.send(200);
		}
		else {
			res.send(201);	
		}
	});	
});

// models.Email.findOne('test@example.com', function(error, exist) {
// 	if (error) {
// 		console.log(error);
// 	}
// 	console.log(exist);
// 	if (exist.length > 0)
// 		console.log(exist);
// });
	

if (cluster.isMaster) {
	for (var i = 0; i < cpuCount; i++) {
		spawn();
	}
	cluster.on('exit', function(worker) {
		console.log('worker ' + worker.id + ' died. spawning a new process...');
		delete workers[worker.pid];
		worker.kill();
		spawn();
	});
} else {
	app.listen(app.get('port'), function() {
		console.log("Listening on " + app.get('port'));
	});
}

function spawn(){
	var worker = cluster.fork();
	workers[worker.id] = worker;
	console.log('worker ' + worker.id + ' was spawned as a new process...');
	return worker;
};


function isEmailAddress(email) {

	var pattern = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/; 
    
    return pattern.test(email);    
};