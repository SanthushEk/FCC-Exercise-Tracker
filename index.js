const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
let bodyParser = require('body-parser');

let mongoose;
try {
  mongoose = require("mongoose");
} catch (e) {
  console.log(e);
}

// Mongoose Set Up
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const Schema = mongoose.Schema;

// User
const userSchema = new Schema({
  username: { type: String, required: true }
})
let userModel = mongoose.model("user", userSchema);

// Exercise
const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: new Date() }
})
let exerciseModel = mongoose.model("exercise", exerciseSchema);

app.use(cors())
app.use(express.static('public'))
app.use("/", bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', (req, res) => {
  let username = req.body.username;
  let newUser = new userModel({ username: username });
  newUser.save();
  res.json(newUser);
})

app.get('/api/users', (req, res) => {
  userModel.find({}).then((users) => {
    res.json(users);
  })
})

app.post('/api/users/:_id/exercises', (req, res) => {
  console.log(req.body);


  let userId = req.params._id;

  exerciseObj = {
    userId: userId,
    description: req.body.description,
    duration: req.body.duration
  }

  // If there is a date add it to the object
  if (req.body.date != ''){
    exerciseObj.date = req.body.date
  }

  let newExercise = new exerciseModel(exerciseObj);

  userModel.findById(userId, (err, userFound) => {
    if (err) console.log(err);

    newExercise.save();
    res.json({
      _id: userFound._id, username: userFound.username,
      description: newExercise.description, duration: newExercise.duration,
      date: new Date(newExercise.date).toDateString()
    })
  })
})

app.get('/api/users/:_id/logs', (req, res) => {

  let fromParam = req.query.from;
  let toParam = req.query.to;
  let limitParam = req.query.limit;  
  let userId = req.params._id;

  // If limit param exists set it to an integer
  limitParam = limitParam ? parseInt(limitParam): limitParam

  userModel.findById(userId, (err, userFound) => {
    if (err) return console.log(err);
    console.log(userFound);

      let queryObj = {
        userId: userId
      };
      // If we have a date add date params to the query
      if (fromParam || toParam){

          queryObj.date = {}
          if (fromParam){
            queryObj.date['$gte'] = fromParam;
          }
          if (toParam){
            queryObj.date['$lte'] = toParam;
          }
        }


    exerciseModel.find(queryObj).limit(limitParam).exec((err, exercises) => {
      if (err) return console.log(err);

      let resObj = 
        {_id: userFound._id,
         username: userFound.username
        }

      exercises = exercises.map((x) => {
        return {
          description: x.description,
          duration: x.duration,
          date: new Date(x.date).toDateString()
        }
      })
      resObj.log = exercises;
      resObj.count = exercises.length;

      res.json(resObj);
    })

  })
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})