const express = require('express');
const app = express();
const fs = require('fs')
const cors = require ('cors')
const bcrypt = require('bcrypt');
const expressJwt = require('express-jwt');
const jwt = require('jsonwebtoken');


app.use(express.static('public'));
app.use(cors());

redirect(app);

const bodyParser = require('body-parser')
app.use(bodyParser.json())


const Sequelize = require ('sequelize');
const sequelize = new Sequelize('mysql://root:1124567@localhost/db_chat3');

class User extends Sequelize.Model{}
User.init({
    nick: Sequelize.STRING,
    email: Sequelize.STRING,
    pass: Sequelize.STRING,
}, { sequelize });

class Message extends Sequelize.Model{}
Message.init({
    message: Sequelize.STRING,
},{sequelize});

class Room extends Sequelize.Model{}
Room.init({
    title: Sequelize.STRING,
},{sequelize});

User.hasMany(Message);
Message.belongsTo(User);
Room.hasMany(Message);
Message.belongsTo(Room);

const config = {
    secret: `buhfghtcnjkjd` 
}

function jwtWare() {
    const { secret } = config;
    console.log(config, secret)
    return expressJwt({ secret }).unless({ 
        path: [
           
            '/users', '/authenticate'
        ]
    });
}

function errorHandler(err, req, res, next) {
    if (typeof (err) === 'string') {
       
        return res.status(400).json({ message: err });
    }

    if (err.name === 'UnauthorizedError') { 
        return res.status(401).json({ message: 'Invalid Token' });
    }

 
    return res.status(500).json({ message: err.message });
}

app.use(jwtWare());


app.post('/users', async function(req,res){
    sequelize.sync();
    console.log(req.body.pass)
    
    let hash = async (password) => {
        let salt = await bcrypt.genSaltSync(10);
        return await bcrypt.hash(req.body.pass, salt)
    }
    let hashPass = await hash(req.body.pass)
    let userFind = await User.findOne({where: {nick: req.body.nick}})
    userFind ? res.status(400).json({message: 'Nick is already in use.'}):
    await User.create({
        nick: req.body.nick,
        email: req.body.email,
        pass: hashPass,
    })
    res.json({message: 'Congratulation!!!!'})
})
app.get('/users', async function(req,res){
    res.send(await User.findAll())
})

app.get('/message', async function (req, res){
    res.send(await Message.findAll({include: [User]}))
  })

app.post('/message', async function (req, res){
    sequelize.sync();
    let msg = await Message.create({
        message: req.body.message
    });
    let [user, isCreated] = await User.findOrCreate({ where: {nick: req.body.nick} });
    let room = await Room.findOne({ where: {id: req.body.room} })

    await msg.setUser(user)
    await msg.setRoom(room)
    
    res.status(201).send(req.body)
})

app.get('/rooms', async function (req, res){
    console.log(req.headers)
    res.send(await Room.findAll())
  })

app.post('/rooms', async function (req, res){
    sequelize.sync();
    let rooms = await Room.create({
        title: req.body.room
    })  
    
    res.status(201).send(req.body)
})




async function authenticate({ nick, pass }) {
   //console.log(nick, pass)
   let user = await User.findOne({ where: {nick: nick }})
   if (user){
   let isValidPass = await bcrypt.compare(pass, user.pass)
    if (isValidPass) {
        const token = jwt.sign({ sub: user.id }, config.secret); 
        const {id, nick, email, ...rest} = user
        return { 
            nick, email,
            token
        };
    }
   }

   }

app.use(bodyParser.urlencoded({ extended: false }));


app.post('/authenticate', function (req, res, next) {
    authenticate(req.body)
        .then(user => user ? res.json(user)
         : res.status(400).json({ message: 'Username or password is incorrect' }))
        .catch(err => next(err));
});


app.get('/', (req, res, next) => {
    res.json({all: 'ok'})
});

app.use(errorHandler);


app.listen(8888, () => {
    console.log('Example app listening on port 8888!');
  });


