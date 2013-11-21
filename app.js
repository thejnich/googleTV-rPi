var express = require('express')
var app = express();

var server = require('http').createServer(app);

var path = require('path');
var io = require('socket.io').listen(server);
var spawn = require('child_process').spawn;
var omx = require('omxcontrol');


// all environments
app.set('port', process.env.TEST_PORT || 9999);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.use(omx());

// development only
if ('development' == app.get('env')) {
   app.use(express.errorHandler());
}

// Routes
app.get('/', function (req, res) {
   res.render('index', { title: 'Index' });
});

app.get('/screen', function (req, res) {
   res.render('screen', { title: 'Screen' });
});

app.get('/remote', function (req, res) {
   res.render('remote', { title: 'Remote' });
});


// Socket.io Config
io.set('log level', 1);


server.listen(app.get('port'), function(){
   console.log('Express server listening on port ' + app.get('port'));
});


// Save the screen socket in this variable
var ss;
// Socket.io Server
io.sockets.on('connection', function (socket) {

   socket.on("screen", function(data){
      socket.type = "screen";
      //Save the screen socket
      ss = socket;
      console.log("Screen ready...");
   });

   socket.on("remote", function(data){
      socket.type = "remote";
      console.log("Remote ready...");
      if(ss != undefined){
         console.log("Synced...");
      }
   });

   socket.on("video", function(data){
      if( data.action === "play"){
         var id = data.video_id,
         url = "http://www.youtube.com/watch?v="+id;

         var runShell = new run_shell('youtube-dl',['-o','%(id)s.%(ext)s','-f','/18/22',url],
            function (me, buffer) { 
               me.stdout += buffer.toString();
               socket.emit("loading",{output: me.stdout});
               console.log(me.stdout)
            },
            function () { 
               //child = spawn('omxplayer',[id+'.mp4']);
               omx.start(id+'.mp4');
         });
      }    
      else if( data.action === "pause"){
         console.log("pause");
         omx.pause();
      }
      else if( data.action === "quit"){
         console.log("quit");
         omx.quit();
      }
   });

});


// Run and pipe shell script output 
function run_shell(cmd, args, cb, end) {
   var spawn = require('child_process').spawn,
       child = spawn(cmd, args),
       me = this;
   child.stdout.on('data', function (buffer) { cb(me, buffer) });
   child.stdout.on('end', end);
}
