var express = require('express');
var app = express();
var morgan = require('morgan');
var path = require('path');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var firebase = require('firebase');
var request = require('request');
var logger = require('logger-request');

var port = process.env.PORT || 8080;
server.listen(port);

//TODO: Initialize Firebase
/*
var config = {
  serviceAccount: "path/to/serviceAccountCredentials.json",
  authDomain: "joinapp-28d70.firebaseapp.com",
  databaseURL: "https://joinapp-28d70.firebaseio.com",
  storageBucket: "joinapp-28d70.appspot.com",
};
firebase.initializeApp(config);
var database = firebase.database();
*/

//Logging tools
/*
app.use(morgan('dev'));
app.use(logger({
  filename: 'logger.log',
}));
*/

app.use("/", express.static(path.join(__dirname, 'site')));

app.use("/manage", express.static(path.join(__dirname, 'manage')));

app.get('/apply', function(req, res) {
  res.redirect(301, 'https://docs.google.com/forms/d/e/1FAIpQLSc60UXvlEPpw-QmruLwiCTDZDsnKph1eYTh_D9P3TGDSLdbeQ/viewform');
});

app.get('/timePerCustomerInQueue', function(req, res){
  var queueId = req.query.queue;
  //TODO count estimated time per customer
  var response = {
    minutes: 0.5
  }
  res.send(response);
});

io.on('connection', function (socket) {
  socket.on('next', function(data){
    //Queue manager clicked next customer button
    //data = {queueId}

    var queueId = data.queueId;

    database.ref('queue/'+queueId).on('value', function(snapshot){
      var queue = snapshot.val();

      //Generate new queue after user exit
      var newQueue = {};
      for (var userInQueue in queue.queue) {
        if (queue.queue.hasOwnProperty(userInQueue)) {

          var newPlaceInQueue = userInQueue - 1;

          if(newPlaceInQueue == 0){
            //You are now out of queue
          }else if(newPlaceInQueue == 1){
            //You are now first in queue
            newQueue[userInQueue - 1] = queue.queue[userInQueue];
            notify(userInQueue, 'This is your turn!');
          }else if(newPlaceInQueue == 2){
            //You are next in the queue
            newQueue[userInQueue - 1] = queue.queue[userInQueue];
            notify(userInQueue, 'You\'re next!');
          }else if(newPlaceInQueue == 4){ //TODO What is the size of buffer queue?
            //User should now join buffer queue
            newQueue[userInQueue - 1] = queue.queue[userInQueue];
            notify(userInQueue, 'It is time to go back to the queue!');
          }else{
            newQueue[userInQueue - 1] = queue.queue[userInQueue];
          }

          updateUser(queue.queue[userInQueue], 'place', userInQueue - 1);
        }
      }

        database.ref('queue/'+queueId+'/queue').set(newQueue);

    });

  });

  socket.on('exit', function(data){
    //Someone wants to exit the queue
    //data = {queueId, uid}
    database.ref('queue/'+data.queueId).on('value', function(snapshot){
      var queue = snapshot.val();

      //Generate new queue after user exit
      var newQueue = {};
      for (var userInQueue in queue.queue) {
        if (queue.queue.hasOwnProperty(userInQueue)) {
          if(queue.queue[userInQueue] == data.uid){
            //This is the user which wants to exit
            //All users behind it must be moved one place forward
                for (var placeInQueueOfUser in queue.queue) {
                  if (queue.queue.hasOwnProperty(placeInQueueOfUser)) {
                    //Check if user is in the queue after the leaving user
                    if(placeInQueueOfUser > userInQueue){
                      var newPlaceInQueue = placeInQueueOfUser - 1;
                      newQueue[newPlaceInQueue] = queue.queue[placeInQueueOfUser];
                      var uid = queue.queue[placeInQueueOfUser];
                      //Send necessary notifications
                        if(newPlaceInQueue == 1){
                          //You are now first in queue
                          notify(uid, 'This is your turn!');
                        }else if(newPlaceInQueue == 2){
                          //You are next in the queue
                          notify(uid, 'You\'re next!');
                        }else if(newPlaceInQueue == 4){ //TODO What is the size of buffer queue?
                          //User should now join buffer queue
                          notify(uid, 'It is time to go back to the queue!');
                        }
                        updateUser(uid, 'place', newPlaceInQueue);
                    }else if (placeInQueueOfUser == userInQueue) {
                      //Don't enter user to the newQueue, cause it is leaving now
                      //Remove user's ongoing queue from database
                      database.ref('user/'+uid+'/ongoingQueues').on('value', function(snapshot){
                        var ongoingQueues = snapshot.val();
                        for (var ongoingQueue in ongoingQueues) {
                          if (ongoingQueues.hasOwnProperty(ongoingQueue)) {
                            if(ongoingQueues[ongoingQueue] == data.queueId){
                              //This is queue to remove
                              database.ref('user/'+uid+'/ongoingQueues/'+data.queueId).set(null);
                            }
                          }
                        }
                      });
                    }else{
                      newQueue[placeInQueueOfUser] = queue.queue[placeInQueueOfUser];
                    }
                  }
                }
          }
        }
      }

      database.ref('queue/'+queueId+'/queue').set(newQueue);
    });
  });

  socket.on('join', function(data){
    //Someone wants to join the queue
    //data = {uid, queueId}

    //Update user's ongoing queue
    var newQueueKey = firebase.database().ref('user/' + data.uid + '/ongoingQueues').push().key;
    database.ref('user/' + data.uid + '/ongoingQueues/' + newQueueKey).set(data.queueId);

    //Insert user into queue.queue
    database.ref('queue/' + data.queueId + '/queue').on('value', function(snapshot){
      var queue = snapshot.val();
      var placeInQueue = Object.keys(queue).length + 1;
      database.ref('queue/' + data.queueId + '/queue/' + placeInQueue).set(queue.uid);
    });
  });

  function updateUser(uid, action, data){
    socket.emit(uid, { action: action, data: data});
  }
})

function notify(uid, text){
  //TODO Send push notification to user's phone
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
