/**
 * Created by Frank on 6/26/2017.
 */
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
app.set('port', (process.env.PORT || 5000));

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    socket.on('chat message', function(msg){
        io.emit('chat message', msg);
    });
});

http.listen(app.get('port'), function(){
    console.log('Node app is running on port', app.get('port'));
});