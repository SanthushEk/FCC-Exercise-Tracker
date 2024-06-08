const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

// Set up mongoose connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

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
app.use(express.static("public"));

// Body-parser middleware
app.use(bodyParser.json()); // to parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", async (req, res) => {
  try {
    let username = req.body.username;
    let newUser = new userModel({ username: username });
    let savedUser = await newUser.save();
    res.json(savedUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    let users = await userModel.find({});
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const userId = req.params._id;
    const { description, duration, date } = req.body;

    let userFound = await userModel.findById(userId);
    if (!userFound) {
      return res.status(404).json({ error: "User not found" });
    }

    // Convert date to yyyy-mm-dd format
    const formattedDate = date
      ? new Date(date).toDateString()
      : new Date().toDateString();

    let exerciseObj = {
      userId: userId,
      description: description,
      duration: duration,
      date: formattedDate,
    };

    let newExercise = new exerciseModel(exerciseObj);
    let savedExercise = await newExercise.save();

    // Update the response to include user details
    res.json({
      _id: userFound._id,
      username: userFound.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/users/:_id/logs", (req, res) => {
  let fromParam = req.query.from;
  let toParam = req.query.to;
  let limitParam = req.query.limit;
  let userId = req.params._id;

  // If limit param exists set it to an integer
  limitParam = limitParam ? parseInt(limitParam) : limitParam;

  userModel.findById(userId, (err, userFound) => {
    if (err) return console.log(err);
    console.log(userFound);

    let queryObj = {
      userId: userId,
    };
    // If we have a date add date params to the query
    if (fromParam || toParam) {
      queryObj.date = {};
      if (fromParam) {
        queryObj.date["$gte"] = fromParam;
      }
      if (toParam) {
        queryObj.date["$lte"] = toParam;
      }
    }

    exerciseModel
      .find(queryObj)
      .limit(limitParam)
      .exec((err, exercises) => {
        if (err) return console.log(err);

        let resObj = { _id: userFound._id, username: userFound.username };

        exercises = exercises.map((x) => {
          return {
            description: x.description,
            duration: x.duration,
            date: new Date(x.date).toDateString(),
          };
        });
        resObj.log = exercises;
        resObj.count = exercises.length;

        res.json(resObj);
      });
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
