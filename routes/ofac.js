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
var Pusher = require("pusher");
var xlxsUtil = require('../utils/xlxs');
var scraper = require('../utils/scraper');
var Excel = require('exceljs');
var path = require('path');
var nodemailer = require('nodemailer');

var URL = process.env.MONGO_URL;
var mailer = require('../utils/mailer');
//--------------------------------
// Download File
//--------------------------------

function buildSheet(worksheet, scrapResult, ofacLogo, searchesObj) {
	let extractedSearch = '';
	if (searchesObj) {
	  for (let key in searchesObj)
	  	extractedSearch += `${key}=${searchesObj[key]} `;
	}

	worksheet.columns = [
    { header: '', key: 'name', width: 25 },
    { header: 'Sanctions List Search', key: 'address', width: 32 },
    { header: '', key: 'type', width: 10 },
    { header: '', key: 'program', width: 10 },
    { header: '', key: 'list', width: 10 },
    { header: '', key: 'score', width: 10 }
	];
  worksheet.getCell('B1').font = { 
		size: 20,
		bold: true,
	};
	worksheet.getCell('B1').alignment = { horizontal: 'center' };

	worksheet.addImage(ofacLogo, 'A1:A1');
	worksheet.getRow(1).height = 60;
  worksheet.addRow(['']);
  worksheet.addRow([`This Sanctions List Search application ("Sanctions List Search") is designed to facilitate the use of the Specially Designated Nationals and Blocked Persons list ("SDN List") and all other sanctions lists administered by OFAC, including the Foreign Sanctions Evaders List, the List of Persons Identified as Blocked Solely Pursuant to E.O. 13599, the Non-SDN Iran Sanctions Act List, the Part 561 list, the Sectoral Sanctions Identifications List and the Non-SDN Palestinian Legislative Council List. Given the number of lists that now reside in the Sanctions List Search tool, it is strongly recommended that users pay close attention to the program codes associated with each returned record. These program codes indicate how a true hit on a returned value should be treated. The Sanctions List Search tool uses approximate string matching to identify possible matches between word or character strings as entered into Sanctions List Search, and any name or name component as it appears on the SDN List and/or the various other sanctions lists. Sanctions List Search has a slider-bar that may be used to set a threshold (i.e., a confidence rating) for the closeness of any potential match returned as a result of a user's search. Sanctions List Search will detect certain misspellings or other incorrectly entered text, and will return near, or proximate, matches, based on the confidence rating set by the user via the slider-bar. OFAC does not provide recommendations with regard to the appropriateness of any specific confidence rating. Sanctions List Search is one tool offered to assist users in utilizing the SDN List and/or the various other sanctions lists; use of Sanctions List Search is not a substitute for undertaking appropriate due diligence. The use of Sanctions List Search does not limit any criminal or civil liability for any act undertaken as a result of, or in reliance on, such use.`]);
  worksheet.getRow(3).height = 180;
  worksheet.getCell('A3').alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('A3').font = { size: 10 };
  if (searchesObj) {
  	worksheet.addRow(['']);
  	worksheet.addRow(['Type', searchesObj.type, 'Address', searchesObj.address]);
  	worksheet.addRow(['Name', searchesObj.name, 'City', searchesObj.city]);
  	worksheet.addRow(['ID #', searchesObj.id, 'State', searchesObj.state]);
  	worksheet.addRow(['Program', searchesObj.program, 'Country', searchesObj.country]);
  	worksheet.addRow(['Minimum Name Score', searchesObj.minimumScore, 'List', searchesObj.list]);

  }
  else {
  	worksheet.addRow(['']);
  	worksheet.addRow(['']);
  	worksheet.addRow(['']);
  	worksheet.addRow(['']);
  	worksheet.addRow(['']);
  	worksheet.addRow(['']);
  }
  	

  worksheet.mergeCells('B1', 'F1');
  worksheet.mergeCells('A2', 'F2');
  worksheet.mergeCells('A3', 'F3');
  worksheet.mergeCells('A4', 'F4');

  worksheet.mergeCells('D5', 'F5');
  worksheet.mergeCells('D6', 'F6');
  worksheet.mergeCells('D7', 'F7');
  worksheet.mergeCells('D8', 'F8');
  worksheet.mergeCells('D9', 'F9');

  worksheet.addRow(['Name','Address','Type','Program(s)','List','Score']);
  worksheet.getCell('A10').font = { bold: true };
  worksheet.getCell('B10').font = { bold: true };
  worksheet.getCell('C10').font = { bold: true };
  worksheet.getCell('D10').font = { bold: true };
  worksheet.getCell('E10').font = { bold: true };
  worksheet.getCell('F10').font = { bold: true };
	scrapResult.map((item, index)=>{
		worksheet.addRow([item.name,item.address,item.type,item.program,item.list,item.score]);
		worksheet.getCell('A' + (index + 11)).value = { text: item.name, hyperlink: item.link };
		worksheet.getCell('A' + (index + 11)).font = {
		   color: { argb: '000000FF' },
		};
	})
}

router.post("/scrap/", async (req, res, next) => {
  var workbook = new Excel.Workbook();
  // let searches = [{name: 'korea'}];

  var ofacLogo = workbook.addImage({
	  filename: path.join(__basedir, 'assets/ofac-logo.png'),
	  extension: 'png',
	});
  let searches = req.body.searches || [];
  let emails = req.body.emails || [];

  let allResults = [];
  for (let i = 0; i < searches.length; i ++) {
  	try {
  		if (!searches[i].name)
  			continue;
			let scrapResult = await scraper.scrapeOFAC(searches[i]);
		  let worksheet = workbook.addWorksheet(searches[i].name);
			buildSheet(worksheet, scrapResult, ofacLogo, searches[i]);
			allResults.push({ search: searches[i], result: scrapResult});
		} catch(err) {
			console.log(err);
		} 
	}
	let worksheet = workbook.addWorksheet('All');
	buildSheet(worksheet, allResults.reduce((r1, r2)=>r1.concat(r2.result), []), ofacLogo);

	let targetFileName = 'OFAC Search - ' + new Date().getTime() + '.xlsx';
  let writeFinished = await workbook.xlsx.writeFile('./tmp/'+targetFileName);

	Promise.all(emails.map(email=>{
		return mailer.sendMailTo(email, 'ofac-search', {
			
		}, 'OFAC Search', [targetFileName]);	
	})).then(()=>{
		fs.remove("./tmp/" + targetFileName);
	}).catch(console.log);
	
	res.json(allResults);

  // MongoClient.connect(URL, function(err, db) {
  //   if (err) throw err;
  //   var collection = db.collection("files");
  //   collection
  //     .find({ _id: ObjectId(fileId) }, { sheet: 0 })
  //     .toArray()
  //     .then(result => {
  //       res.download('./uploads/' + result[0].user_id + '/' + result[0].project_id + '/' + (result[0].filepath ? result[0].filepath : result[0].filename))
  //     });
  // });
});



module.exports = router;
