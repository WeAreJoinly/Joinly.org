var express = require('express');
var app = express();
var path = require('path');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var firebase = require('firebase');
var request = require('request');

var port = process.env.PORT || 8080;
server.listen(port);

// Initialize Firebase
//Key id = 2dfbf1133b79ecaa9be5a901d7dac9457216805f
var config = {
  serviceAccount: "path/to/serviceAccountCredentials.json",
  authDomain: "joinapp-28d70.firebaseapp.com",
  databaseURL: "https://joinapp-28d70.firebaseio.com",
  storageBucket: "joinapp-28d70.appspot.com",
};
firebase.initializeApp(config);
var database = firebase.database();

//Process GET requests
app.use("/", express.static(path.join(__dirname, 'site')));

app.get('/apply', function(req, res) {
  res.redirect(301, 'https://docs.google.com/forms/d/e/1FAIpQLSc60UXvlEPpw-QmruLwiCTDZDsnKph1eYTh_D9P3TGDSLdbeQ/viewform');
});

app.get('/queue', function(req,res) {
  res.send('<h1>This function is coming soon! :)</h1>');
});

//Process socket.io
io.on('connection', function (socket) {
  console.log('user has been connected');
  socket.on('leave', function(data){
    //Someone wants to leave the queue
    //data = {uid, queue}

    //1. Remove uid from queue in the database
    database.ref('queue/'+data.queue+'/queue').on('value', function(snapshot) {
      var queue = snapshot.val();
      var newQueue = {};
      for (var userInQueue in queue) {
        if (queue.hasOwnProperty(userInQueue)) {
          if(userInQueue != data.uid){
            if(queue[userInQueue] == 0){
              //This is 0 user (it must stay)
              newQueue[userInQueue] = 0;
            }else{
              if(queue[userInQueue] > queue[data.uid]){
                newQueue[userInQueue] = queue[userInQueue] - 1;
                //2. Inform user to move 1 place forward

                //Notifications
                if((queue[userInQueue] -1) == 2){
                  //If next in queue
                  //Send notification
                  notify(userInQueue, "You are next in queue!");
                }else if((queue[userInQueue] -1) == 1){
                  //It is your time
                  //Send notification
                  notify(userInQueue, "Now it is your time!");
                }else if((queue[userInQueue] -1) == 6){
                  //There are now 10 people in front of you
                  //Send notification
                  notify(userInQueue, "There are still 5 people in front of you in the queue");
                }else if((queue[userInQueue] -1) == 11){
                  //There are now 10 people in front of you (come to buffer line)
                  //Send notification
                  notify(userInQueue, "It is time for you to get to the buffer line!");
                }else if((queue[userInQueue] -1) == 21){
                  //There are now 10 people in front of you
                  //Send notification
                  notify(userInQueue, "There are now 20 people in front of you in the queue");
                }
              }
            }
          }else{
            //Do not add this to new queue, cause this is the user which wanted to leave
            database.ref('user/'+userInQueue+'/ongoingQueue').set(null);
          }
        }
      }
      database.ref('queue/'+data.queue+'/queue').set(newQueue);
    });
  });

  socket.on('nextCustomer', function(data){
    //Queue manager clicked 'Next customer' button
    //data = {queue}
    //1. Revove first user from the queue
    database.ref('queue/'+data.queue+'/queue').on('value', function(snapshot) {
      var queue = snapshot.val();
      var newQueue = {};
      for (var userInQueue in queue) {
        if (queue.hasOwnProperty(userInQueue)) {
          if (queue[userInQueue] == 1) {
            //This user must removed from the queue
            socket.emit(data.queue, { uid: userInQueue, do: 'removeFromQueue'});
            database.ref('user/'+userInQueue+'/ongoingQueue').set(null);
          }else if (queue[userInQueue] == 0) {
            //This is 0 user (it must stay)
            newQueue[userInQueue] = 0;
          }else{
            newQueue[userInQueue] = queue[userInQueue] - 1;

            if((queue[userInQueue] -1) == 2){
              //If next in queue
              //Send notification
              notify(userInQueue, "You are next in queue!");
            }else if((queue[userInQueue] -1) == 1){
              //It is your time
              //Send notification
              notify(userInQueue, "Now it your time!");
            }else if((queue[userInQueue] -1) == 11){
              //There are now 10 people in front of you
              //Send notification
              notify(userInQueue, "There are now 10 people in front of you in the queue");
            }else if((queue[userInQueue] -1) == 21){
              //There are now 10 people in front of you
              //Send notification
              notify(userInQueue, "There are now 20 people in front of you in the queue");
            }
          }
        }
      } //--> For loop end
      database.ref('queue/'+data.queue+'/queue').set(newQueue);
    });
  });
});

function notify(uid, text){
  //TODO
}



/*
//Chat bot

var BootBot = require('bootbot');

var bot = new BootBot({
  accessToken: 'EAAG3xPE4ZA6MBAJa5gLZBeIY70ZBUFl78YJd5ssLs06femjPUS8WfUS5RAKPwGZC7BKhrYRJbfLFx5cnR7cZAIZCY2rlorDmZBd07ErvUZB2tkkDRR9APJf5lZC0YaNLQI9tIPE17r217U3BsmyVg4xykALEtomeAaJpPFFgcGSdRvQZDZD',
  verifyToken: 'thisIsEpic',
  appSecret: '9f379ff95611bdd294663247de02d109'
});

bot.on('message', (payload, chat) => {
  var text = payload.message.text;
  console.log(text);
  chat.say('This is my reply 1');
});

bot.hear(['status'], (payload, chat) => {
    chat.say(`This is my reply 2`);
});

bot.start();
*/
