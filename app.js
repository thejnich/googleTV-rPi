var express = require('express')
var app = express();

var http = require('http')
var server = http.createServer(app);

var path = require('path');
var io = require('socket.io').listen(server);
var spawn = require('child_process').spawn;
var omx = require('omxcontrol');
var querystring = require("querystring");


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
   res.render('remote', { title: 'rPiTV-Remote' });
});

app.get('/screen', function (req, res) {
   res.render('screen', { title: 'rPiTV-Screen' });
});

app.get('/remote', function (req, res) {
   res.render('remote', { title: 'rPiTV-Remote' });
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
         playVideo(data.video_id);
         /*
         var id = data.video_id,
         url = "http://www.youtube.com/watch?v="+id;

         var runShell = new run_shell('youtube-dl',['-o','%(id)s.%(ext)s','-f','/18/22',url],
            function (me, buffer) { 
               me.stdout += buffer.toString();
               ss.emit("loading",{output: me.stdout});
               console.log(me.stdout)
            },
            function () { 
               //child = spawn('omxplayer',[id+'.mp4']);
               ss.emit("playing");
               omx.start(id+'.mp4');
         });
         */
      }    
      else if( data.action === "pause"){
         console.log("pause");
         omx.pause();
      }
      else if( data.action === "quit"){
         console.log("quit");
         ss.emit("done");
         omx.quit();
      }
   });

   socket.on("search", function(data){
      /*
      console.log(data.query.split(" "));
      var queryString = "http://gdata.youtube.com/feeds/api/videos\?max-results=1&" + querystring.stringify(
         { prettyprint: true, hd: true, v: 2, alt: 'json', q: data.query.split(" ").join('+') });
      console.log(queryString);

      var request = require('request');
      request(queryString, function (error, response, body) {
         if (!error && response.statusCode == 200) {
            var json = JSON.parse(body);
            console.log(json.feed.entry[0]);
            var video_id = json.feed.entry[0]['media$group']['yt$videoid']['$t'];
            playVideo(video_id);
         }
      });
      */
   });

});

function playVideo(id) {

   console.log("Attempting to load and play id: "+id);

   url = "http://www.youtube.com/watch?v="+id;

   var runShell = new run_shell('youtube-dl',['-o','%(id)s.%(ext)s','-f','/18/22',url],
         function (me, buffer) { 
            me.stdout += buffer.toString();
            ss.emit("loading",{output: me.stdout});
            console.log(me.stdout)
         },
         function () { 
            //child = spawn('omxplayer',[id+'.mp4']);
            ss.emit("playing");
            omx.start(id+'.mp4');
         });
}

// Run and pipe shell script output 
function run_shell(cmd, args, cb, end) {
   var spawn = require('child_process').spawn,
       child = spawn(cmd, args),
       me = this;
   child.stdout.on('data', function (buffer) { cb(me, buffer) });
   child.stdout.on('end', end);
}
