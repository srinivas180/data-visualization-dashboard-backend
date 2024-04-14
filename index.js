require("./db");
const express = require("express");
const xlsx = require("xlsx");
const _ = require("lodash");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("config");
const cors = require("cors");
const Stat = require("./models/Stat");
const User = require("./models/User");
const authMiddleware = require("./middleware/auth.js");

const app = express();
app.use(express.json());
app.use(cors());

if (!config.get("jwtPrivateKey")) {
  console.error("FATAL ERROR: jwtPrivateKey is not defined.");
  process.exit(1);
}

const workbook = xlsx.readFile("data.xlsx");
const sheetName = workbook.SheetNames[0];
const analyticsData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

async function createStat(stat) {
  console.log(stat);
  const newStat = new Stat(stat);
  const createdStat = await newStat.save();
}

function excelDateToJSDate(date) {
  return new Date(Math.round((date - 25569) * 86400 * 1000));
}

async function removeAllStats() {
  const result = await Stat.deleteMany({});
  console.log("RESULT", result);
}

function createDB() {
  analyticsData.forEach((stat) => {
    const newStat = { ...stat, Day: excelDateToJSDate(stat.Day) };
    console.log(newStat);
    createStat(newStat);
  });
}

// createDB();

// removeAllStats();

async function aggregateFeaturesSum(age, gender, fromDate, toDate) {
  const pipeline = [];

  if (age !== undefined) {
    pipeline.push({ $match: { Age: age } });
  }

  if (gender !== undefined) {
    pipeline.push({ $match: { Gender: gender } });
  }

  if (fromDate !== undefined && toDate !== undefined) {
    pipeline.push({
      $match: {
        Day: {
          $gte: new Date(fromDate),
          $lte: new Date(toDate),
        },
      },
    });
  }

  pipeline.push({
    $group: {
      _id: null,
      aTimeSpent: { $sum: "$A" },
      bTimeSpent: { $sum: "$B" },
      cTimeSpent: { $sum: "$C" },
      dTimeSpent: { $sum: "$D" },
      eTimeSpent: { $sum: "$E" },
      fTimeSpent: { $sum: "$F" },
    },
  });

  const result = await Stat.aggregate(pipeline);

  return {
    A: result[0].aTimeSpent,
    B: result[0].bTimeSpent,
    C: result[0].cTimeSpent,
    D: result[0].dTimeSpent,
    E: result[0].eTimeSpent,
    F: result[0].fTimeSpent,
  };
}

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.get("/totalTimeSpent", authMiddleware, async (req, res) => {
  const age = req.query.age;
  const gender = req.query.gender;
  const fromDate = req.query.fromDate;
  const toDate = req.query.toDate;

  const result = await aggregateFeaturesSum(age, gender, fromDate, toDate);
  res.send(result);
});

app.get("/feature-trend/:feature", async (req, res) => {
  const feature = req.params.feature;

  const age = req.query.age;
  const gender = req.query.gender;
  const fromDate = req.query.fromDate;
  const toDate = req.query.toDate;

  const pipeline = [];

  if (age !== undefined) {
    pipeline.push({ $match: { Age: age } });
  }

  if (gender !== undefined) {
    pipeline.push({ $match: { Gender: gender } });
  }

  if (fromDate !== undefined && toDate !== undefined) {
    pipeline.push({
      $match: {
        Day: {
          $gte: new Date(fromDate),
          $lte: new Date(toDate),
        },
      },
    });
  }

  pipeline.push({
    $group: {
      _id: "$Day",
      [feature]: { $sum: `$${feature}` },
    },
  });

  pipeline.push({ $sort: { _id: 1 } });

  pipeline.push({ $project: { _id: 0, Day: "$_id", [feature]: 1 } });

  const featureTrend = await Stat.aggregate(pipeline);

  res.send(featureTrend);
});

app.post("/users", async (req, res) => {
  res.header({ "Access-Control-Allow-Origin": "*" });
  let user = await User.findOne({ email: req.body.email });
  if (user) {
    return res.status(400).send("User already registered.");
  }

  user = new User({
    email: req.body.email,
    password: req.body.password,
  });

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  const savedUser = await user.save();

  const token = await jwt.sign({ _id: user._id }, config.get("jwtPrivateKey"));
  res.send({ token, ..._.pick(savedUser, ["_id", "email"]) });
});

app.post("/auth", async (req, res) => {
  let user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(400).send("Invalid email or password.");
  }

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword) {
    return res.status(400).send("Invalid email or password.");
  }

  const token = await jwt.sign({ _id: user._id }, config.get("jwtPrivateKey"));
  res.send({ token });
});

app.listen(3000, () => {
  console.log("server started");
});
