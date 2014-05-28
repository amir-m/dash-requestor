stackTraceLimit = Infinity;

var cluster = require('cluster'),
	express = require("express"),
	request = require("request"),
	app = express(),
    workers = {},
    cpuCount = require('os').cpus().length;
var forked = false;

app.use(require('morgan')('dev'));
app.set('port', process.env.PORT || 8000);

app.get('/call', function(req, res){
	
	var uri = req.originalUrl.replace('/call?', '');

	res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    request(uri, function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	    
	    res.send(body);
	  }
	});
});
	

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

