stackTraceLimit = Infinity;

var cluster = require('cluster'),
	express = require("express"),
	request = require("request"),
	redis = require("redis"),
	// redisClient = redis.createClient(6379, '54.185.233.146'), 
	redisClient = redis.createClient(6379, 'dbkcache.serzbc.0001.usw2.cache.amazonaws.com'),
	models = require("./models").config(),
	app = express(),
    workers = {},
    cpuCount = require('os').cpus().length;
var forked = false;

models.ready(function(){
	console.log('Connected');
});

app.use(require('morgan')('dev'));
app.set('port', process.env.PORT || 80);
app.use(require('body-parser')());
app.use(require('method-override')());

app.get('/call', function(req, res){
	
	var uri = req.originalUrl.replace('/call?', '');

	if (!uri) return res.send(400);

	res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    request(uri, function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	    res.send(body);
	    body = null;
	  }
	  else {
	  	res.send(500);
	  }
	});
});

app.get('/', function(req, res){
	res.send('Hello :)');
});

app.post('/email', function(req, res){

	res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
	console.log(req.param('email'));

    if (!isEmailAddress(req.param('email'))) return res.send(400);
		

	models.WaitingListEntry.findOne({
		email: req.param('email')
	}, function(error, exist) {
		if (error) {
			return res.send(500);
		}

		if (exist) {
			res.send(409);
		}
		else {
			var wle = new models.WaitingListEntry({
				email: req.param('email'),
				status: 1,
				added_from: 'web',
				created_at: new Date().getTime()
			});
			wle.save();
			models.WaitingListEntry.count({ confirmed: false }, function(error, count){
				if (error) return res.send(500);

				res.send(200, { count: count + 7520 });
			})
		}
	});	
});

app.get('/:by/confirm', function(req, res){
	var at = new Date().getTime();
	if (req.param('key').toLowerCase() != 'dbk2014!') return res.send(404);
	if (req.param('by').toLowerCase() != 'mo' 
		&& req.param('by').toLowerCase() != 'amir') return res.send(404);

	if (!isEmailAddress(req.param('e'))) return res.send( req.param('e') + ' is not a valid email buddy! R U Drunk?!');

	redisClient.hmset('confirmed:'+req.param('e').toLowerCase(), {
		confirmed_at: at,
		confirmed_by: req.param('by').toLowerCase()
	});
	res.send(req.param('e') + ' is now confirmed...');
	models.WaitingListEntry.findOne({ email: req.param('e').toLowerCase() }, function(error, wle){
		if (error) throw error;
		if (wle) {
			wle.confirmed = true;
			wle.confirmed_by = req.param('by').toLowerCase();
			wle.confirmed_at = at;
			wle.status = 3;
			wle.save();
			redisClient.hset('user:'+wle.uuid, 'status', 3);
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

	email = email.toLowerCase();

	var pattern = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/; 
    
    return pattern.test(email);    
};