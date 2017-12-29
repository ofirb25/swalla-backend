

// Minimal Simple REST API Handler (With MongoDB and Socket.io)
// Plus support for simple login and session
// Plus support for file upload
// Author: Yaron Biton misterBIT.co.il

'use strict';

var cl = console.log;

const express = require('express'),
	bodyParser = require('body-parser'),
	cors = require('cors'),
	mongodb = require('mongodb')

const clientSessions = require('client-sessions');
const upload = require('./uploads');
const app = express();
const shortid = require('shortid');
const addRoutes = require('./routes');
addRoutes(app);

var corsOptions = {
	origin: /http:\/\/localhost:\d+/,
	credentials: true
};

const serverRoot = 'http://localhost:3003/';
const baseUrl = serverRoot + 'data';

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(clientSessions({
	cookieName: 'session',
	secret: 'C0d1ng 1s fun 1f y0u kn0w h0w', // set this to a long random string!
	duration: 30 * 60 * 1000,
	activeDuration: 5 * 60 * 1000,
}));

const http = require('http').Server(app);
const io = require('socket.io')(http);


function dbConnect() {

	return new Promise((resolve, reject) => {
		// Connection URL
		var url = 'mongodb://localhost:27017/swalla';
		// Use connect method to connect to the Server
		mongodb.MongoClient.connect(url, function (err, db) {
			if (err) {
				cl('Cannot connect to DB', err)
				reject(err);
			}
			else {
				//cl('Connected to DB');
				resolve(db);
			}
		});
	});
}

var objTypeRequiresUser = {
	todo: true
}
// This function is called by all REST end-points to take care
// setting the basic mongo query:
// 1. _id if needed
// 2. userId when needed
function getBasicQueryObj(req) {
	const objType = req.params.objType;
	const objId = req.params.id;
	var query = {};

	if (objId) {
<<<<<<< HEAD
 			try { query._id = new mongodb.ObjectID(objId);}
		catch(e) {return query}
=======
		try { query._id = new mongodb.ObjectID(objId); }
		catch (e) { return query }
>>>>>>> 7b50ce9d488b57cdd8c34c727d85eed0ca0c7725
	}
	if (!objTypeRequiresUser[objType]) return query;
	query.userId = null;
	if (req.session.user) query.userId = req.session.user._id
	return query;
}

// GETs a list
app.get('/data/:objType', function (req, res) {
	const objType = req.params.objType;
	var query = getBasicQueryObj(req);
	dbConnect().then(db => {
		const collection = db.collection(objType);

		collection.find(query).toArray((err, objs) => {
			if (err) {
				cl('Cannot get you a list of ', err)
				res.json(404, { error: 'not found' })
			} else {
				cl('Returning list of ' + objs.length + ' ' + objType + 's');
				res.json(objs);
			}
			db.close();
		});
	});
});

// GETs a single
app.get('/data/:objType/:id', function (req, res) {
	const objType = req.params.objType;
	const objId = req.params.id;
	cl(`Getting you an ${objType} with id: ${objId}`);
	var query = getBasicQueryObj(req)
	dbConnect()
		.then(db => {
			const collection = db.collection(objType);

			return collection.findOne(query)
				.then(obj => {
					cl('Returning a single ' + objType);
					res.json(obj);
					db.close();
				})
				.catch(err => {
					cl('Cannot get you that ', err)
					res.json(404, { error: 'not found' })
					db.close();
				})

		});
});

// DELETE
app.delete('/data/:objType/:id', function (req, res) {
	const objType = req.params.objType;
	const objId = req.params.id;
	cl(`Requested to DELETE the ${objType} with id: ${objId}`);
	var query = getBasicQueryObj(req);

	dbConnect().then((db) => {
		const collection = db.collection(objType);
		collection.deleteOne(query, (err, result) => {
			if (err) {
				cl('Cannot Delete', err)
				res.json(500, { error: 'Delete failed' })
			} else {
				if (result.deletedCount) res.json({});
				else res.json(403, { error: 'Cannot delete' })
			}
			db.close();
		});

	});
});

// POST - adds 
app.post('/data/:objType', upload.single('file'), function (req, res) {
	//console.log('req.file', req.file);
	// console.log('req.body', req.body);

	const objType = req.params.objType;
	cl('POST for ' + objType);

	const obj = req.body;
	delete obj._id;
	if (objTypeRequiresUser[objType]) {
		if (req.session.user) {
			obj.userId = req.session.user._id;
		} else {
			res.json(403, { error: 'Please Login first' })
			return;
		}
	}
	// If there is a file upload, add the url to the obj
	// if (req.file) {
	// 	obj.imgUrl = serverRoot + req.file.filename;
	// }



	dbConnect().then((db) => {
		const collection = db.collection(objType);

		collection.insert(obj, (err, result) => {
			if (err) {
				cl(`Couldnt insert a new ${objType}`, err)
				res.json(500, { error: 'Failed to add' })
			} else {
				cl(objType + ' added');
				res.json(obj);
			}
			db.close();
		});
	});

});

// PUT - updates
app.put('/data/:objType/:id', function (req, res) {
<<<<<<< HEAD
	const objType 	= req.params.objType;
	const objId 	= req.params.id;
	const newObj 	= req.body;	
=======
	const objType = req.params.objType;
	const objId = req.params.id;
	const newObj = req.body;
>>>>>>> 7b50ce9d488b57cdd8c34c727d85eed0ca0c7725

	cl(`Requested to UPDATE the ${objType} with id: ${objId}`);
	var query = getBasicQueryObj(req)

	dbConnect().then((db) => {
		const collection = db.collection(objType);
		collection.updateOne(query, newObj,
			(err, result) => {
				if (err) {
					cl('Cannot Update', err)
					res.json(500, { error: 'Update failed' })
					console.log('*******************')
					
				} else {
					if (result.modifiedCount) res.json(newObj);
					else res.json(403, { error: 'Cannot update' })
				}
				db.close();
			});
	});
});

// Basic Login/Logout/Protected assets
app.post('/login', function (req, res) {
	dbConnect().then((db) => {
		db.collection('user').findOne({ username: req.body.username, pass: req.body.pass }, function (err, user) {
			if (user) {
				cl('Login Succesful');
				delete user.pass;
				req.session.user = user;
				res.json({ token: 'Beareloginr: puk115th@b@5t', user });
			} else {
				cl('Login NOT Succesful');
				req.session.user = null;
				res.json(403, { error: 'Login failed' })
			}
		});
	});
});

app.get('/logout', function (req, res) {
	req.session.reset();
	res.end('Loggedout');
});

function requireLogin(req, res, next) {
	if (!req.session.user) {
		cl('Login Required');
		res.json(403, { error: 'Please Login' })
	} else {
		next();
	}
}

app.get('/protected', requireLogin, function (req, res) {
	res.end('User is loggedin, return some data');
});


// Kickup our server 
// Note: app.listen will not work with cors and the socket
// app.listen(3003, function () {
http.listen(3003, function () {
	console.log(`misterREST server is ready at ${baseUrl}`);
	console.log(`GET (list): \t\t ${baseUrl}/{entity}`);
	console.log(`GET (single): \t\t ${baseUrl}/{entity}/{id}`);
	console.log(`DELETE: \t\t ${baseUrl}/{entity}/{id}`);
	console.log(`PUT (update): \t\t ${baseUrl}/{entity}/{id}`);
	console.log(`POST (add): \t\t ${baseUrl}/{entity}`);

});

var matches = [];

function findMatchByPin(pin) {
	return matches.find(match => match.pin === pin);

}
function joinMatch(pin, playerName, Clientsocket) {
	var match = findMatchByPin(pin)
	if (match.isActive) return false
	match.players.push({
		userId: Clientsocket.id,
		nickname: playerName,
		score: 0
	})
	return match
}
function getGame(gameId) {
	var newGameId = new mongodb.ObjectID(gameId)
	return dbConnect()
		.then(db => {
			const collection = db.collection('game');
			return collection.findOne({_id:newGameId})
				.then(obj => {
					db.close();
					console.log
					return obj
				})
				.catch(err => {
					res.json(404, { error: 'not found' })
					db.close();
				})
		});
}
function createGame(playerName, gameId, Clientsocket) {
	var match = {
		pin: shortid(),
		hostId: Clientsocket.id,
		gameId,
		isActive: false,
		players: [{
			userId: Clientsocket.id,
			// socket:Clientsocket,
			nickname: playerName,
			score: 0
		}]
	}
	matches.push(match);
	return match
}

io.on('connection', (socket) => {
	console.log('a user connected');
	socket.on('disconnect', () => {
		console.log('user disconnected');
	});
	socket.on('chat msg', (msg) => {
		// console.log('message: ' + msg);
		io.emit('chat newMsg', msg);
	});
	socket.on('JOIN_MATCH', ({ pin, playerName }) => {
		var match = joinMatch(pin, playerName, socket);
		if (match) {
			socket.join(match.pin);
			console.log('*****player joined ******', match)
			io.to(match.pin).emit('PLAYER_JOINED', match)
		}
		else {
			//todo : add message in case game has started
		}
	});
	socket.on('START_GAME', ({ pin }) => {
		console.log('*****game started****** pin:', pin)
		//set match as active
		var match = findMatchByPin(pin)
		match.isActive = true;
		//emit to all mathch players that game has started
		io.to(match.pin).emit('START_GAME', match)
	});
	socket.on('SET_MULTI_GAME', ({ gameId, playerName }) => {
		console.log('****************************game Was set')
		console.log(socket.id);
		var match = createGame(playerName, gameId, socket)
		console.log(match)
		socket.emit('GAME_CREATED', match)
		socket.join(match.pin)
	});
	socket.on('SHOW_PREV' , ({ pin }) => {
		var match = findMatchByPin(pin)
		if (!match.isPrevOn) {
			match.isPrevOn = true;
			io.to(match.pin).emit('SHOW_PREV')
			setTimeout(() => {
				io.to(match.pin).emit('PREV_DONE')
			}, 2500)
		}
	})

	socket.on('QUESTION_STARTED', ({ time, pin }) => {
		var match = findMatchByPin(pin);
		if (!match.isQuestionOn) {
			io.to(match.pin).emit('QUESTION_STARTED')
			match.isPrevOn = false;
			match.isQuestionOn = true;
			match.answersCount = 0
			setTimeout(() => {
				match.isQuestionOn = false
				setTimeout(()=>{
					io.to(match.pin).emit('TIME_UP')
				},3000)
			}, time)
		}
	})
	socket.on('PLAYER_ANSWERED', ({ points, pin }) => {
		console.log('PLayer answered!!!!!!', points, pin)
		var match = findMatchByPin(pin)
		var player = match.players.find(player => player.userId === socket.id)
		player.score += points
		match.answersCount++
		io.to(match.pin).emit('PLAYER_ANSWERED', { players: match.players, answersCount: match.answersCount })
	});

	socket.on('SHOW_SCORES',({pin})=>{
		var match = findMatchByPin(pin);
		if(!match.isScoreOn) {
			match.isScoreOn = true;
			setTimeout(()=>{
				match.isScoreOn = false;
				io.to(match.pin).emit('NEXT_QUESTION')
			},3000)
		}
	});
});

cl('WebSocket is Ready');
