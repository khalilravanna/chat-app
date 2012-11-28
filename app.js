var express = require('express');
var routes  = require('./routes');
var http    = require('http');

var app = express();

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

//app.get('/', routes.index);
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/views/index.html');
});

var server = http.createServer(app);

server.listen(3001);
console.log("Express server listening on port " + app.get('port'));

var io  = require('socket.io').listen(server);

//only allows numbers and letters
var illegalChars = /[\W_]/;
//map of usernames to sockets
var users = {};
//messages
var messages = {};

io.sockets.on('connection', function (socket) {
  console.log("This socket's id: " + socket.id);
  console.log("clients: " + io.clients);
  console.log(users);

  socket.on('UserLogin', function(username){
    //let all the other sockets know of the arrival of a new user
    if(!illegalChars.test(username) && username.length < 19){
      users[username] = socket.id;
      socket.set('username', username);
      socket.broadcast.emit('UserArrive', username);
      socket.emit('UserLoginSuccess', username);
      //force update of user list on login
      var data = [];
      for(var username in users){
        data.push(username);
      }    
      socket.emit('UpdateUserList', data);
    }
    else
      socket.emit('UserReject');
  });
  
  //when a message is sent, route it to the correct socket
  socket.on('TextMessage', function(data){
    var sid = users[data.recipient];
    var text = data.text;
    io.sockets.socket(sid).emit('ReceiveMessage', data);
  });
  
  //when a user requests an updated user list we send them an updated list of users
  socket.on('RequestUserListUpdate', function(){
    var data = [];
    for(var username in users){
      data.push(username);
    }
    socket.emit('UpdateUserList', data);
  });

  //tell other users of user leaving
  socket.on('disconnect', function(){
    var username;
    socket.get('username', function(err, name){
      username = name;
    })
    console.log("deleting username: " + username);
    delete users[username];
    socket.broadcast.emit('UserLeave', username);
  });
});