$(function(){
	//this function takes a user and updates the messages field with the messages with that user
	var updateMessages = function(user){
		$("#userMessages").html('');
		$("#userMessages").html('<blockquote class="pull-right">');
		for(var i = 0; i < messages[user].length; i++){
			$("#userMessages").append('<small>'+ messages[user][i].time +'</small>'); 
			//bold text that is sent by you
			console.log(myUsername);
			if(messages[user][i].sender == myUsername)
				$("#userMessages").append('<p><strong>' + messages[user][i].text +'</strong></p>');
			else
				$("#userMessages").append('<p>' + messages[user][i].text +'</p>');
		}
		$("#userMessages").append('</blockquote>');
	}

	//initialize the login modal
	$("#loginModal").modal();
	$modal = $("#loginModal").clone();

	var socket = io.connect();

	//initialize variables
	var myUsername = '';
	var selectedUser = undefined;
	//this will be a map of usernames to lists of messages. they will be pushed when received or sent to maintain order
	var messages = {};
	

	$("#loginButton").click(function(){
		var username = $("#username").val();
		socket.emit('UserLogin', username);
	});

	$('button[name=sendButton]').click(function(){
	//if a user is selected then we send the message to them, otherwise we do nothing
	if(selectedUser != undefined){
	  	var username = selectedUser; 
	  	var text = $("#sendText").val();
	  	var d = Date();
	  	var data = {
	  		sender : myUsername,
	  		text : text,
	  		recipient : username,
	  		time : d
	  	};
	  	console.log(data);
	  	socket.emit('TextMessage', data);
	  	//we also save messages we send
	  	messages[username].push(data);
	  	updateMessages(username);
	  	$("#sendText").val('');
	}
	else
		alert("Select a user first!");
	});


	//when a user arrives or leaves update the user list
	socket.on('UserArrive', function(username){
		console.log("UserArrive: " + username);
		//whenever a user leaves we have to get an updated list of users
		socket.emit('RequestUserListUpdate');
		//create a new list attached to the username to store messages
		messages[username] = [];
		$("#alert").html(
			'<div class="alert alert-success">'+
			'<button type="button" class="close" data-dismiss="alert">×</button>'+
			'A new user has connected.</div>'
		);
	});

	socket.on('UserLeave', function(username){
		console.log("UserLeave: " + username);
		socket.emit('RequestUserListUpdate');
		//get rid of old messages
		delete messages[username];
		//if the person we're chatting to leaves we update the screen to show the user is talking to no one
		if(selectedUser = username){
			$("#userMessages").html('');
			$("#currentUser").html('<p class="lead">Chatting With: no one...<img height="50px" width="50px" src="http://i.imgur.com/NpOjx.png"></img></p>');
		}
		$("#alert").html(
			'<div class="alert alert-error">'+
			'<button type="button" class="close" data-dismiss="alert">×</button>'+
			'A user has left.</div>'
		);
	});

	//receives a list of usernames from the server as data in response to a 'RequestUserListUpdate' emit
	socket.on('UpdateUserList', function(data){
		console.log(data);
		//Add users to our user list
		$("#userlist").html('<li class="nav-header">Users Online</li>');
		for(var i=0; i<data.length; i++){
			if(myUsername != data[i]){
	  		$("#userlist").append('<li><a rel="userItem" id='+ data[i] +' href="#">' + '<img src="http://robohash.org/'+ data[i] +'.png?size=50x50">'+ data[i] + '</a></li>');
	  		//new users get messages intitialized
	  		if(messages[data[i]] == undefined)
	  			messages[data[i]] = [];
			}
		}
		//if the user is the only one, make sure they know they are
		if(data.length == 1)
			$("#userlist").append('<li><a href="#"><img height="100px" width="150px" src="http://i.imgur.com/GDwXc.gif"></img></a></li><li><a href="#">No Users Online</a></li>');
		//After we update the list of users we attach the event that allows them to be selected
		$("a[rel=userItem]").click(function(){
			var user = $(this).attr("id");
			selectedUser = user;
			$("#currentUser").html('<p class="lead"><img src="http://robohash.org/'+ user
				+ '.png?size=50x50"> Chatting With: '+ user +'</p>');
			console.log(messages[user]);
			//update messages after click
			updateMessages(user);
		});
	})


	socket.on('ReceiveMessage', function(data){
		console.log("I received a message from: " + data.sender + " at " + data.time +". They told me: " + data.text + ".");
		message = {
			text: data.text,
			time: data.time
		};
		messages[data.sender].push(message);
		console.log(messages);
		//change to the new message screen
		user = data.sender;
		selectedUser = user;
		$("#currentUser").html('<p class="lead"><img src="http://robohash.org/'+ user
				+ '.png?size=50x50"> Chatting With: '+ user +'</p>');
		//alert the user they've received a message
		$("#alert").html(
			'<div class="alert alert-info">'+
			'<button type="button" class="close" data-dismiss="alert">×</button>'+
			'Received a message from <strong>'+ user +'</strong></div>'
		);
		console.log(messages[user]);
		//update messages
		updateMessages(user);
	});

	//hide the modal when a successful login occurs and save our username
	socket.on('UserLoginSuccess', function(username){
		$("#loginModal").modal('hide');
		myUsername = username;
		$(".span2").prepend('<h3>Welcome, ' + username + '</h3><img src="http://robohash.org/' + username +'.png?size=100x100" class="img-polaroid"></br></br>')
	});

	//show an error message if an unsuccessful login attempt
	socket.on('UserReject', function(){
		$("#modalControl").addClass("error");
		$(".modal-body").prepend('<p class="text-error">Error: that username is invalid or is already being used!</p>');
	});
});