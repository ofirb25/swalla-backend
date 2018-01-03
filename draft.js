


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
var serveStatic = require('serve-static');

addRoutes(app);

var corsOptions = {
	origin: /http:\/\/localhost:\d+/,
	credentials: true
};

const serverRoot = 'http://localhost:3003/';
const baseUrl = serverRoot + 'data';
app.use(serveStatic(__dirname + "/dist"));
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(clientSessions({
	cookieName: 'session',
	secret: 'C0d1ng 1s fun 1f y0u kn0w h0w', // set this to a long random string!
	duration: 30 * 60 * 1000,
	activeDuration: 5 * 60 * 1000,
}));
// app.use(history)
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
		try { query._id = new mongodb.ObjectID(objId); }
		catch (e) { return query }
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
	const objType = req.params.objType;
	const objId = req.params.id;
	const newObj = req.body;

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
var activePlayersMap = {};

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

function removeFromMatch(socketId) {
	if (activePlayersMap[socketId]) {
		var playerMatch = matches.find(match => {
			return match.pin === activePlayersMap[socketId]
		})
		var idx = playerMatch.players.findIndex(player => player.userId === socketId)
		playerMatch.players.splice(idx, 1);
		if (playerMatch.players.length === 0) removeMatch(playerMatch.pin)
	}
}

function removeMatch(pin) {
	var idx = matches.findIndex(match => match.pin === pin)
	matches.splice(idx, 1)
}

function getGame(gameId) {
	var newGameId = new mongodb.ObjectID(gameId)
	return dbConnect()
		.then(db => {
			const collection = db.collection('game');
			return collection.findOne({ _id: newGameId })
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
function createMatch(playerName, gameId, Clientsocket) {
	var match = {}
	return dbConnect()
		.then(db => {
			const collection = db.collection('game');
			var id = new mongodb.ObjectID(gameId)
			return collection.findOne({ _id: id })
				.then(obj => {
					cl('Returning a single game: from match', obj);

					match = {
						pin: shortid(),
						hostId: Clientsocket.id,
						gameId,
						currQuestion: 0,
						questionsCount: obj.questions.length,
						isActive: false,
						isGameOn: true,
						players: [{
							userId: Clientsocket.id,
							// socket:Clientsocket,
							nickname: playerName,
							score: 0
						}]
					}
					db.close();
					matches.push(match);
					return match;
				})
				.catch(err => {
					cl('Cannot get you that ', err)
					res.json(404, { error: 'not found' })
					db.close();
				})
		});

}
function saveMatch(match) {
	dbConnect().then((db) => {
		const match = db.collection('match');
		const game = db.collection.game('game')
		match.insert(match, (err, result) => {
			if (err) {
				cl(`Couldnt insert a new match`, err)
			} else {
				cl('match', match + ' added');
			}
			// // var id = new mongodb.ObjectID(match.gameId)
			// // game.findOne({_id:id},err,foundGame=>{
			// // 	if(err) {
			// // 		cl(`Couldnt fetch a game`, err)
			// // 	} else {
			// // 		foundGame.playersCount+= match.players.length
			// // 		var currhighScore = foundGame.highscore;
			// // 		var matchScores = match.players.map(player=>{
			// // 			return player.score
			// // 		})
			// // 		var max = Math.max(...matchScores)
			// // 		if (max > currhighScore) foundGame.highscore = max;
			// // 		delete foundGame._id;
			// // 		game.updateOne({_id:id},foundGame,err,res=>{
			// // 			if(err) {
			// // 				console.log('couldnt update',foundGame)
			// // 			} else {
			// // 				console.log('updated !',res)
			// // 			}
			// // 		})
			// // 	}
			// })
			db.close();
		});
	});
}
io.on('connection', (socket) => {
	console.log('a user connected');
	socket.on('disconnect', () => {
		removeFromMatch(socket.id)
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
			io.to(match.pin).emit('PLAYER_JOINED', match)
			activePlayersMap[socket.id] = pin;
			console.log(activePlayersMap, 'Joined to room map')
		}
		else {
			//todo : add message in case game has started
		}
	});
	socket.on('START_GAME', ({ pin }) => {
		console.log('*****game started****** pin:', pin)
		var match = findMatchByPin(pin)
		match.isActive = true;
		io.to(match.pin).emit('START_GAME', match)
	});
	socket.on('SET_MULTI_GAME', ({ gameId, playerName }) => {
		var match = createMatch(playerName, gameId, socket).then(match => {
			activePlayersMap[socket.id] = match.pin;
			socket.emit('GAME_CREATED', match)
			socket.join(match.pin)
		})
	});
	socket.on('SHOW_PREV', ({ pin }) => {
		var match = findMatchByPin(pin)
		console.log('match.isPrevOn', match.isPrevOn, 'match.currQuestion', match.currQuestion, 'match.questionsCount', match.questionsCount)
		if (!match.isPrevOn && match.currQuestion <= match.questionsCount) {
			match.currQuestion++;
			match.isPrevOn = true;
			io.to(match.pin).emit('SHOW_PREV')
			setTimeout(() => {
				io.to(match.pin).emit('PREV_DONE')
			}, 2500)
		} else if (!match.isPrevOn) {
			io.to(match.pin).emit('GAME_OVER')
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
				setTimeout(() => {
					io.to(match.pin).emit('TIME_UP')
				}, 3000)
			}, time)
		}
	})

	socket.on('PLAYER_ANSWERED', ({ points, pin }) => {
		var match = findMatchByPin(pin)
		var player = match.players.find(player => player.userId === socket.id)
		player.score += points
		match.answersCount++
		io.to(match.pin).emit('PLAYER_ANSWERED', { players: match.players, answersCount: match.answersCount })
	});

	socket.on('SHOW_SCORES', ({ pin }) => {
		var match = findMatchByPin(pin);
		if (!match.isScoreOn) {
			match.isScoreOn = true;
			setTimeout(() => {
				match.isScoreOn = false;
				io.to(match.pin).emit('NEXT_QUESTION')
			}, 3000)
		}
	});
	socket.on('GAME_OVER', ({ pin }) => {
		var match = findMatchByPin(pin);
		if (match && match.isGameOn) {
			match.isGameOn = false;
			saveMatch(match)
			removeMatch(match.pin)
		}
	})

});

cl('WebSocket is Ready');
