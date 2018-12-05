var express = require("express");
var app = express();
var path = require('path');
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var router = express.Router();

var userRoutes = require("./routes/users");
var authRoutes = require("./routes/auth");

var morgan = require("morgan");
var nodemailer = require('nodemailer');
var smtpTransport = require("nodemailer-smtp-transport");

global.__basedir = __dirname;

app.use(morgan("dev"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "PUT,POST,PATCH,DELETE,GET");
    return res.status(200).json({});
  }
  next();
});

// app.use(express.static(path.join(__dirname + '/client/dist')));

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use((req, res, next) => {
  const error = new Error("Not Found");
  res.status(404);
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    error: error.message
  });
});


module.exports = app;
