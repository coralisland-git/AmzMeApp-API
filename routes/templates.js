const express = require("express");
const router = express.Router();
var multer = require("multer");
var MongoClient = require("mongodb").MongoClient;
var CircularJSON = require("circular-json");
var mkdirp = require("mkdirp");
var fs = require("fs-extra");
var XLSX = require("xlsx");
var ObjectId = require("mongodb").ObjectId;
var crypto = require("crypto");
var jwt = require("jsonwebtoken");
var config = require("../config");
var URL = process.env.MONGO_URL;

//--------------------------------
// Download File
//--------------------------------

router.get("/download/:fileId", (req, res, next) => {
  res.download('./assets/templates/' + req.params.fileId + '.xlsx');
});

module.exports = router;
