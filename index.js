/**
 * Created by Frank on 6/26/2017.
 */
let express = require('express');
let app = express();
let http = require('http').Server(app); //Chat stuff
let io = require('socket.io')(http); //Web sockets
let multer = require('multer'); //Uploading files
let bodyParser = require('body-parser'); //Handling post requests
let pg = require('pg'); //Postgres
let session = require('cookie-session');

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(require('morgan')('dev'));

app.use(session({secret: 'keyboard cat', maxAge: 60000 }));

if (process.env.DATABASE_URL){
    pg.defaults.ssl = true;
}
const connectionString = process.env.DATABASE_URL || "postgres://postgres:5720297@localhost:5432/final_project";

app.set('port', (process.env.PORT || 5000));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
    sessionStuff = {badUser: 0, registered: 0};
    res.render('pages/main', sessionStuff);
});

//Just connection stuff
io.on('connection', function(socket){
    socket.on('chat message', function(msg){
        io.emit('chat message', msg);
    });
});

//Uploading code
let storage =   multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, './public/uploads');
    },
    filename: function (req, file, callback) {
        let extension = file.mimetype;
        let filename = file.fieldname + '-' + Date.now() + '.' + extension.substring(6);
        callback(null, filename);
        console.log(file);
        addUser(req, filename);
    }

});
let upload = multer({ storage : storage}).single('userPhoto');


//Register endpoint
app.post('/register', function (request, response) {
    upload(request,response,function(err) {
        if(err) {
            return response.end("Error uploading file.");
        }


    });
    sessionStuff = {badUser: 0, registered: 1};
    response.render('pages/main', sessionStuff);
});

app.post('/login', function (request, response, next) {

    checkUsername(request, response, next);
    //console.log('req.session', request.session);
    //console.log("nickname before rendering:" + request.session.nickname);
});

function checkUsername(request, response, next) {
    let client = new pg.Client(connectionString);

    let username = request.body.username;
    console.log("Username: " + username);

    client.connect(function (err) {
        if (err) {
            console.log("Error: Could not connect to DB");
            console.log(err);
        }

        const sql = 'SELECT username, nickname, profile_pic_url FROM "user" WHERE username = $1';
        const params = [username];

        let query = client.query(sql, params, function (err, result) {
            client.end(function (err) {
                if (err) throw err;
            });

            if (err) {
                console.log("Error in query: ");
                console.log(err);
            }
            else if (!request.session) {
                return next(new Error('Error in session')) // handle error
            }
            else{
                if (result.rows.length > 0) {
                    console.log(result.rows[0].nickname);
                    console.log(result.rows[0].username);
                    console.log(request.session);
                    request.session.username = result.rows[0].username;
                    request.session.nickname = result.rows[0].nickname;
                    request.session.profile_pic_url = result.rows[0].profile_pic_url;
                    sessionStuff = {nickname: request.session.nickname, profile_pic_url: result.rows[0].profile_pic_url};
                    response.render('pages/index', sessionStuff);
                }
                else {
                    sessionStuff = {badUser: 1, registered: 0};
                    response.render('pages/main', sessionStuff);
                }
            }

        });
    });
}

function addUser(request, filename) {
    let client = new pg.Client(connectionString);

    let username = request.body.username;
    let nickname = request.body.nickname;
    let pic = filename;

    client.connect(function (err) {
        if (err) {
            console.log("Error: Could not connect to DB");
            console.log(err);
        }

        console.log("Adding a user to the database");

        const sql = 'INSERT INTO "user" (username, nickname, profile_pic_url, registration_date)VALUES ($1::text, $2::text, $3::text, current_timestamp)';
        const params = [username, nickname, pic];

        let query = client.query(sql, params, function (err, result) {
            client.end(function (err) {
                if (err) throw err;
            });

            if (err) {
                console.log("Error in query: ");
                console.log(err);
            }

        });
    });
}


http.listen(app.get('port'), function(){
    console.log('Node app is running on port', app.get('port'));
});