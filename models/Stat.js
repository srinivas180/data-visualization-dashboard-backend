const mongoose = require("mongoose");

const statSchema = new mongoose.Schema({
  Day: {
    type: Date,
    required: true,
  },
  Age: {
    type: String,
    required: true,
  },
  Gender: {
    type: String,
    enum: ["Male", "Female"],
  },
  A: {
    type: Number,
    required: true,
  },
  B: {
    type: Number,
    required: true,
  },
  C: {
    type: Number,
    required: true,
  },
  D: {
    type: Number,
    required: true,
  },
  E: {
    type: Number,
    required: true,
  },
  F: {
    type: Number,
    required: true,
  },
});

const Stat = mongoose.model("Stat", statSchema);
module.exports = Stat;
