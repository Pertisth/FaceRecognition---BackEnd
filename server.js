const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt-nodejs");
const cors = require("cors");
const knex = require("knex");
const Clarifai = require("clarifai");
require('dotenv').config();


// faceRecognition API Declaration
const appClarifai = new Clarifai.App({
    apiKey: process.env.REACT_APP_API
  });

//   "92b6ac80851240b39b3027e6b162ce44"


const db = knex({
    client: 'pg',
    connection:{
        host:"127.0.0.1",
        user :"postgres",
        password:"123456",
        database: "faceRecognition",
    }
});



const app = express();

app.use(bodyParser.json());
app.use(cors())



app.get("/",(req,res)=>{
    res.send(Database.users);

})

app.post("/signin",(req,res)=>{

    const {email,password} = req.body;

    if(!email ||!password){
        return res.status(400).json("Data not entered");
    }

    db.select("email","password").from("login")
    .where({email : email})
    .then(data =>{
        const isValid = bcrypt.compareSync(req.body.password,data[0].password);
        if(isValid){
            return db.select("*").from("users")
            .where("email","=",email)
            .then(user =>{
                res.json(user[0])
            }).catch(err => res.status(400).json("Unable to get user"))
        }
        else{
            res.status(400).json("Bad Credentials")
        }
    }).catch(err => res.status(400).json("Bad Credentials"));

})



app.post("/register",(req,res)=>{
    const {email,name,password} = req.body;

    if(!email || !name || !password){
        return res.status(400).json("Data not entered");
    }
    
    const hash = bcrypt.hashSync(password);

    db.transaction(trx =>{
        trx.insert({
            password:hash,
            email:email
        })
        .into("login")
        .returning("email")
        .then(loginEmail =>{
            return trx("users")
                .returning("*")
                .insert({
                    email:loginEmail[0],
                    name:name,
                    joined:new Date()
                })
                .then(user => {
                    res.json(user[0]);
                })
            })
            .then(trx.commit)
            .catch(trx.rollback)
    })
    .catch(err => res.status(400).json("Unable to register"));
    
})

app.get("/profile/:id",(req,res)=>{
    const {id} = req.params;

    db.select("*").from("users").where({id:id})
    .then(user =>{
        if(user.length){
            res.json(user[0]);
        }else{
            res.status(400).json("Profile not found");
        }
    })

})    


app.put("/image",(req,res)=>{
    const id = req.body.id;
    db("users").where({id:id})
    .increment("entries" , 1)
    .returning("entries")
    .then(entries =>{
        res.json(entries[0]);
    }).catch(err => res.status(400).json("Unable to fetch entries"))
})

app.post("/imageDetectAPI",(req,res)=>{
    appClarifai.models.predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
    .then(data =>{
        res.json(data)
    }).catch(err => res.status(400).json("API Failure"));
})



app.listen(process.env.PORT || 4000,()=>{
    console.log(`Sever listening to port ${process.env.PORT}`);
})


