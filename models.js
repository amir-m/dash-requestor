var self = this,
	mongoose = require('mongoose'),
	crypto = require('crypto'),
	redisClient,
	connectionString = "mongodb://admin:IuT603JamshEqplE2N&0}x!@candidate.19.mongolayer.com:10061/dbk";


function _objectId() {
	var id = (new mongoose.Types.ObjectId).toString();
	id = crypto.createHash('sha1').update(id).digest('hex');
	return (new Buffer(id).toString('base64').replace(/=/g, ""));
};

function config (r) {
	redisClient = r;
	return self;
};

function cipher (text) {
	// change the key
	var key = 'NmU5MTgzYzJhNjM1N2JkZjhhMjAxZDc5OWM0ODFlZDYzMTYxNmQ3Ng';

	var cipher = crypto.createCipher('aes-256-cbc', key);
	var crypted = cipher.update(text, 'utf8', 'hex');
	crypted += cipher.final('hex');
	return crypted;		
};

function decipher(text){
	var key = 'NmU5MTgzYzJhNjM1N2JkZjhhMjAxZDc5OWM0ODFlZDYzMTYxNmQ3Ng';
	var decipher = crypto.createDecipher('aes-256-cbc', key);
	var dec = decipher.update(text,'hex','utf8');
	dec += decipher.final('utf8');
	return dec;
};

function findOneEmail(email, callback) {
	
	// email = cipher(email);

	redisClient.keys('email:'+email, function(error, exist){
		if (error) {
			if (callback) callback(error);
			console.log("ERROR: error in finding email");
			console.log(error);
		}

		if(callback) callback(null, exist);
	});
};

var WaitingListEntrySchema = new mongoose.Schema({
	uuid: String,
	email: String,
	status: String,
	app_launched: { type: Boolean, default: false },
	added_from: String,
	confirmed: { type: Boolean, default: false },
	confirmed_by: String,
	confirmed_at: Number,
	created_at: Number
});
var WaitingListEntry = mongoose.model('WaitingListEntry', WaitingListEntrySchema);

function ready(callback) {
	mongoose.connect(connectionString, function(err){
		if (err) throw err;
		if (callback) callback();
	});
};

var Email = {
	findOne: findOneEmail
};

exports.config = config;
exports.id = _objectId;
exports.ready = ready;
exports.Email = Email;
exports.WaitingListEntry = WaitingListEntry;
exports.cipher = cipher;