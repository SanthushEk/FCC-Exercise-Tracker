const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

// Set up mongoose connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true },
});
let userModel = mongoose.model("User", userSchema);

const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String, required: true }, 
});
let exerciseModel = mongoose.model("Exercise", exerciseSchema);

app.use(cors());
app.use(express.static('public'));

// Body-parser middleware
app.use(bodyParser.json()); // to parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true })); 

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', async (req, res) => {
  try {
    let username = req.body.username;
    let newUser = new userModel({ username: username });
    let savedUser = await newUser.save();
    res.json(savedUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    let users = await userModel.find({});
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const userId = req.params._id;
    const { description, duration, date } = req.body;

    let userFound = await userModel.findById(userId);
    if (!userFound) {
      return res.status(404).json({ error: "User not found" });
    }

    // Convert date to yyyy-mm-dd format
    const formattedDate = date ? new Date(date).toDateString() : new Date().toDateString();

    let exerciseObj = {
      userId: userId,
      description: description,
      duration: duration,
      date: formattedDate
    };

    let newExercise = new exerciseModel(exerciseObj);
    let savedExercise = await newExercise.save();

    // Update the response to include user details
    res.json({
      _id: userFound._id,
      username: userFound.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userId = req.params._id;
    let { from, to, limit } = req.query;

    const userFound = await userModel.findById(userId);
    if (!userFound) {
      return res.status(404).json({ error: "User not found" });
    }

    // Construct query object
    const query = { userId: userId };
    if (from || to) {
      query.date = {};
      if (from) {
        query.date.$gte = new Date(from);
      }
      if (to) {
        query.date.$lte = new Date(to);
      }
    }

    // Apply limit to the query
    let exercisesQuery = exerciseModel.find(query);
    if (limit) {
      exercisesQuery = exercisesQuery.limit(parseInt(limit));
    }

    // Execute query
    const exercises = await exercisesQuery.exec();

    // Format logs
    const logs = exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date 
    }));

    res.json({
      _id: userFound._id,
      username: userFound.username,
      count: exercises.length,
      log: logs
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
