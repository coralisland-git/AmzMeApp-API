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
var Excel = require('exceljs');


var pusher = new Pusher({
  appId: "528462",
  key: "edc0fafa92d65aa9bace",
  secret: "f5f7bb64d29de2bb3092",
  cluster: "us2",
  encrypted: true
});
var URL = process.env.MONGO_URL;

var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "./tmp/");
  },
  filename: function(req, file, cb) {
    //var datetimestamp = Date.now();
    cb(null, file.originalname);
  }
});
var upload = multer({
  storage: storage,
  onError: function(err, next) {
    console.log("error", err);
    next(err);
  }
}).single("file");

//--------------------------------
// Download File
//--------------------------------

router.get("/download/:userId/:projectId/:fileId", (req, res, next) => {
  const userId = req.params.userId;
  const projectId = req.params.projectId;
  const fileId = req.params.fileId;
  MongoClient.connect(URL, function(err, db) {
    if (err) throw err;
    var collection = db.collection("files");
    collection
      .find({ _id: ObjectId(fileId) }, { sheet: 0 })
      .toArray()
      .then(result => {
        res.download('./uploads/' + result[0].user_id + '/' + result[0].project_id + '/' + (result[0].filepath ? result[0].filepath : result[0].filename))
      });
  });
});


//--------------------------------
// Download Excel File
//--------------------------------
router.get("/report/excel/:fileId", (req, res, next) => {
  
  const fileId = req.params.fileId;
  const pad_with_zeroes = function(number, length) {
    var my_string = '' + number;
    while (my_string.length < length) {
        my_string = '0' + my_string;
    }

    return my_string;
  }

  MongoClient.connect(URL, function(err, db) {
    if (err) throw err;
    var collection = db.collection("files");
    collection
      .find({ _id: ObjectId(fileId) }, { sheet: 0 })
      .toArray()
      .then(result => {

        let renderData = xlxsUtil.getRenderData(result[0]);
        var workbook = new Excel.Workbook();
        var worksheet = workbook.addWorksheet('CommonBrain');

        worksheet.columns = [
          { header: `${result[0].title}`, key: 'A', width: 10 },
          { header: '', key: 'B', width: 10 },
          { header: '', key: 'C', width: 10 },
          { header: '', key: 'D', width: 10 },
          { header: '', key: 'E', width: 20 },
          { header: '', key: 'F', width: 20 },
          { header: '', key: 'G', width: 5 },
          { header: '', key: 'H', width: 20 },
          { header: '', key: 'I', width: 20 },
          { header: '', key: 'J', width: 10 },
        ];
        worksheet.mergeCells('A1:J1');
        worksheet.getRow(1).height = 40;
        worksheet.getCell('A1').font = {
            size: 40,
            bold: true
        };
        let rowNum = 2;
        let row;
        renderData.map((dash, dashIndex)=>{
          
          row = worksheet.addRow([`${dash.dash.dashName || ''}  ${dash.dash.name2 || ''}`]);
          row.height = 30;
          row.getCell(1).font = {
              size: 25,
              bold: true
          };
          row.getCell(1).name = "Dash" + pad_with_zeroes(dashIndex+1, 2);
          rowNum ++;
          dash.data.map((sheet, sheetIndex)=>{
            row = worksheet.addRow(['', `${sheet.name || ''}`]);
            row.height = 25;
            row.getCell(2).font = {
                size: 20,
                bold: true
            };
            row.getCell(2).name = "Dash" + pad_with_zeroes(dashIndex+1, 2) + "Sheet" + pad_with_zeroes(sheetIndex+1, 2);
            rowNum ++;
            sheet.data.map((tab, tabIndex)=>{
              row = worksheet.addRow(['', '', `${tab.name || ''}`]);
              row.height = 20;
              row.getCell(3).font = {
                  size: 18,
                  bold: true
              };
              row.getCell(3).name = "Dash" + pad_with_zeroes(dashIndex+1, 2) + "Sheet" + pad_with_zeroes(sheetIndex+1, 2) + "Tab" + pad_with_zeroes(tabIndex+1, 2);
              rowNum ++;

              tab.data.map((majcat, majIndex)=>{
                row = worksheet.addRow(['', '', '', `${majcat.name || ''}`]);
                rowNum ++;

                row.getCell(4).name = "Dash" + pad_with_zeroes(dashIndex+1, 2) + "Sheet" + pad_with_zeroes(sheetIndex+1, 2) + "Tab" + pad_with_zeroes(tabIndex+1, 2) + "Major" + pad_with_zeroes(majIndex+1, 2);
                
                for (let i = 0; i < majcat.data.length; i+=2) {
                  if (i+1 < majcat.data.length) {
                    row = worksheet.addRow(['', '', '', '', `${majcat.data[i].spec_category || ''}`, `${majcat.data[i].formatted || ''}`, '', `${majcat.data[i+1].spec_category || ''}`, `${majcat.data[i+1].formatted || ''}`]);

                    if (majcat.data[i].source)
                      row.getCell(6).value = { text: majcat.data[i].formatted, hyperlink: majcat.data[i].source };
                    if (majcat.data[i+1].source)
                      row.getCell(9).value = { text: majcat.data[i+1].formatted, hyperlink: majcat.data[i+1].source };

                    row.getCell(5).alignment = { wrapText: true };
                    row.getCell(6).alignment = { wrapText: true };
                    row.getCell(8).alignment = { wrapText: true };
                    row.getCell(9).alignment = { wrapText: true };
                    rowNum ++;
                  } else {
                    row = worksheet.addRow(['', '', '', '', `${majcat.data[i].spec_category || ''}`, `${majcat.data[i].formatted || ''}`]);

                    if (majcat.data[i].source)
                      row.getCell(6).value = { text: majcat.data[i].formatted, hyperlink: majcat.data[i].source };
                    
                    row.getCell(5).alignment = { wrapText: true };
                    row.getCell(6).alignment = { wrapText: true };
                    row.getCell(8).alignment = { wrapText: true };
                    row.getCell(9).alignment = { wrapText: true };
                    rowNum++;
                  }
                }
              })
            })
          })
        })

        let filename = `./tmp/${new Date().getTime()}.xlsx`;
        workbook.xlsx.writeFile(filename).then(()=>{
          res.download(filename)
        });
      });
  });
});



//--------------------------------
// Delete File
//--------------------------------

router.delete("/:userId/:projectId/:fileId", (req, res, next) => {
  const userId = req.params.userId;
  const projectId = req.params.projectId;
  const fileId = req.params.fileId;
  // console.log('Deleteing')
  MongoClient.connect(URL, function(err, db) {
    if (err) throw err;
    var collection = db.collection("files");
    collection
      .find({ _id: ObjectId(fileId) }, { sheet: 0 })
      .toArray()
      .then(result => {
        
        fs.unlink('./uploads/' + result[0].user_id + '/' + result[0].project_id + '/' + result[0].filename)
        fs.unlink('./uploads/' + result[0].user_id + '/' + result[0].project_id + '/' + result[0]._id + '.jpg')
        MongoClient.connect(URL, function(err, db) {
          if (err) throw err;
          var fileCollection = db.collection("files");
          fileCollection.deleteOne({ _id: ObjectId(fileId) });
          res.status(200).send('Deleted Successfully')
        })
      });
  });
});

//--------------------------------
// Upload File Image
//--------------------------------

router.post("/:userId/:projectId/:fileId/image", (req, res, next) => {
  upload(req, res, function(err) {
    var userId = req.params.userId;
    var projectId = req.params.projectId;
    var fileId = req.params.fileId;
    if(err){
      console.log(err)
    }
    var extension = req.file.filename.substr(-4);
    var fileName = req.params.fileId;
    fs.rename('./tmp/' + req.file.filename, './tmp/'+ fileName + extension).then(res1=>{
      fs.move('./tmp/' + fileName + extension, './uploads/'+userId+'/'+projectId+'/' + fileName + '_image' + extension, { overwrite: true }).then(result=>{
        MongoClient.connect(URL, function(err, db) {
          if (err) throw err;
          var collection = db.collection("files");
          collection.findOne({ _id: ObjectId(fileId) }, { sheet: 0 }).then(result => {
            if (result != null) {
              collection
                .update({ _id: ObjectId(fileId) },{$set : {"image":true}})
                .then(result => {
                  res.status(200).send({message:'uploaded'})
                });
            } else {
              res.status(401).send({ error: err });
            }
          });
        });
        
      })
    });
  })
})

//--------------------------------
// Upload File Logo
//--------------------------------

router.post("/:userId/:projectId/:fileId/logo", (req, res, next) => {
  upload(req, res, function(err) {
    var userId = req.params.userId;
    var projectId = req.params.projectId;
    var fileId = req.params.fileId;
    if(err){
      console.log(err)
    }
    var extension = req.file.filename.substr(-4);
    var fileName = req.params.fileId;
    fs.rename('./tmp/' + req.file.filename, './tmp/'+ fileName + extension).then(res1=>{
      fs.move('./tmp/' + fileName + extension, './uploads/'+userId+'/'+projectId+'/' + fileName + '_logo' + extension, { overwrite: true }).then(result=>{
        MongoClient.connect(URL, function(err, db) {
          if (err) throw err;
          var collection = db.collection("files");
          collection.findOne({ _id: ObjectId(fileId) }, { sheet: 0 }).then(result => {
            if (result != null) {
              collection
                .update({ _id: ObjectId(fileId) },{$set : {"logo":true}})
                .then(result => {
                  res.status(200).send({message:'uploaded'})
                });
            } else {
              res.status(401).send({ error: err });
            }
          });
        });
        
      })
    });
  })
})
//--------------------------------
// Upload File
//--------------------------------

router.post("/:projectId/add", (req, res, next) => {
  fake_background_job("file");
  upload(req, res, function(err) {
    if (err) {
      res.status(401).send({ error: err });
    }
    var projectId = req.params.projectId;
    var userId = req.body.userId;
    // var fileName = req.body.fileName;
    var dir = "/uploads/" + userId + "/" + projectId;
    if(!req.file) {
      res.status(401).json({
        errors: {
          form: 'File is required.'
        }
      });
      return;
    }
    var filename = req.file.filename;

    MongoClient.connect(URL, function(err, db) {
      if (err) throw err;

      var collection = db.collection("files");
      collection
      .find({ project_id: projectId, user_id: userId, filename: filename }, { sheet: 0 })
      .toArray()
      .then(result => {
        if (result.length > 0) {
          res.status(401).json({
            type: 'filename_exist',
            file: result[0]
          });
        } else {

          let timestamp = new Date().getTime();
          let filepath  = filename + '$$$$' + timestamp;
          fs.move("./tmp/" + filename, "./" + dir + "/" + filepath, function(err) {
            if (err) {
              fs.remove("./tmp/" + filename);
              res.status(401).json({
                errors: {
                  form: "File Exists"
                }
              });
            } else {
              let obj = xlxsUtil.parseSheet("./" + dir + "/" + filepath)

              if (!obj.success) {
                res.status(401).json({
                  errors: {
                    form: obj.error
                  }
                });
                return;
              }
              let fileSave = {
                name: filename.substring(0, filename.length - 5),
                filename: filename,
                filepath: filepath,
                file_uploaded: new Date(),
                file_updated: new Date(),
                user_id: userId,
                project_id: projectId,
                rows: obj.rows,
                // sheet: obj.sheet,
                title: obj.title,
                dashes: obj.dashes,
                imageFrom: 'file',
                imageFileUrl: obj.imageFileUrl,
                logoFrom: 'file',
                logoFileUrl: obj.logoFileUrl,
                rootImages: obj.rootImages,
                majorImages: obj.majorImages
              };
              MongoClient.connect(URL, function(err, db) {
                if (err) throw err;
                collection
                  .insert(fileSave)
                  .then(
                    result => {
                      let id = result.insertedIds[0].toString();
                      let newpath = filepath + '$$$' + id + '.xlsx';
                      fs.move("./" + dir + "/" + filepath, "./" + dir + "/" + newpath, function(err) {
                        if (err) {
                        } else {
                          collection
                          .update({ _id: ObjectId(id) },{ $set: {
                            filepath: newpath
                          }}).then(result=>{

                            res.status(200).json({
                              message: "Upload Successful"
                            });
                          })
                        }
                      });
                    },
                    err => {
                      fs.remove("./" + dir + "/" + filepath);
                      res.status(401).send({ error: err });
                    }
                  );
              });
            }
          });
        }
      })
    });
  });
});

//--------------------------------
// Replace File
//--------------------------------

router.post("/replace/:projectId/:fileId", (req, res, next) => {
  var fileId = req.params.fileId;
  MongoClient.connect(URL, function(err, db) {
    if (err) throw err;
    var collection = db.collection("files");
    collection
      .find({ _id: ObjectId(fileId) }, { sheet: 0 })
      .toArray()
      .then(result => {
        upload(req, res, function(err) {
          var projectId = req.params.projectId;
          var userId = req.body.userId;
          var fileName = result[0].filename;
          mkdirp("./uploads/test", function(err) {
            var dir = "/uploads/" + userId + "/" + projectId;
            var filename = req.file.filename;
            let timestamp = new Date().getTime();
            let filepath  = filename + '$$$$' + timestamp + '$$$' + result[0]._id + '.xlsx';
            fs.move("./tmp/" + filename, "./" + dir + "/" + filepath, { overwrite: true }, function(err) {
              try {
                if (err) {
                  console.log(err);
                  fs.remove("./tmp/" + filename);
                  res.status(401).json({
                    errors: {
                      form: "File Exists"
                    }
                  });
                } else {
                  let obj = xlxsUtil.parseSheet("./" + dir + "/" + filepath);
                  if (!obj.success) {
                    res.status(401).json({
                      errors: {
                        form: obj.error
                      }
                    });
                    return;
                  }
                  MongoClient.connect(URL, function(err, db) {
                    if (err) throw err;
                    var collection = db.collection("files");
                    
                    collection
                      .update({ _id: ObjectId(fileId) },{ $set: {
                        name: filename.substring(0, filename.length - 5),
                        filename: filename,
                        filepath: filepath,
                        file_uploaded: new Date(),
                        file_updated: new Date(),
                        user_id: userId,
                        project_id: projectId,
                        rows: obj.rows,
                        // sheet: obj.sheet,
                        title: obj.title,
                        dashes: obj.dashes,
                        imageFrom: 'file',
                        imageFileUrl: obj.imageFileUrl,
                        logoFrom: 'file',
                        logoFileUrl: obj.logoFileUrl,
                        rootImages: obj.rootImages,
                        majorImages: obj.majorImages
                      }})
                      .then(
                        result => {
                          res.status(200).json({
                            message: "Upload Successful"
                          });
                        },
                        err => {
                          
                          res.status(401).send({ error: err });
                        }
                      );
                  });
                }
              } catch (err) {

                res.status(401).json({
                  errors: {
                    form: "Somethng went wrong."
                  }
                });
              }
            });
          });
        });
        
        
        
      });
  });

  
});

//--------------------------------
// Update File 
//--------------------------------
router.put("/update/:userId/:projectId/:fileId", (req, res, next) => {
  var chart = req.body;
  
  MongoClient.connect(URL, function(err, db) {
    if (err) throw err;
    var collection = db.collection("files");

    collection
      .update({ _id: ObjectId(req.params.fileId) }, {$set:chart})
      .then(
        result => {
          res.status(200).json({
            message: "Update Successfull"
          });
        },
        err => {
          res.status(401).send({ error: err });
        }
      );
  });

})

//--------------------------------
// Upload File ~~~~~TEST~~~~~
//--------------------------------

router.post("/testupload", (req, res, next) => {
  fake_background_job("file");

  upload(req, res, function(err) {
    var projectId = req.params.projectId;
    var userId = req.body.userId;
    var fileName = req.body.fileName;
   
      
        
          var workbook = XLSX.readFile('./tmp/'+req.file.filename);
          var sheet = JSON.parse(CircularJSON.stringify(workbook));
          res.send(sheet);
          var cb = sheet.Sheets.CommonBrain;
          var sheetNames = [];
          var rows = {};
          
          var title;
          for (var i = 0; i < Object.keys(cb).length; i++) {
            if (i == Object.keys(cb).length / 2) {
            }
            var key = Object.keys(cb)[i];
            var letter = key.charAt(0);
            var number = key.substr(1);
            if (letter == "A" && number == 1) {
              title = cb[Object.keys(cb)[i]].v;
            }
            if (letter.match(/[a-z]/i)) {
              var row = {};

              if (number > 2) {
                number = parseInt(number);
                if (Object.keys(cb[Object.keys(cb)[i]]).length > 0) {
                  if (rows[number] != null) {
                    if (letter == "A") {
                      rows[number]["sheet_name"] = cb[Object.keys(cb)[i]].v;
                    }
                    if (letter == "B") {
                      rows[number]["tab_name"] = cb[Object.keys(cb)[i]].v;
                    }
                    if (letter == "C") {
                      rows[number]["major_category"] = cb[Object.keys(cb)[i]].v;
                    }
                    if (letter == "D") {
                      rows[number]["spec_category"] = cb[Object.keys(cb)[i]].v;
                    }
                    if (letter == "E") {
                      rows[number]["value"] = cb[Object.keys(cb)[i]].v;
                      rows[number]["type"] = cb[Object.keys(cb)[i]].t;
                      rows[number]["formatted"] = cb[Object.keys(cb)[i]].w
                    }
                    if (letter == "F") {
                      rows[number]["hover"] = cb[Object.keys(cb)[i]].v;
                    }
                    if (letter == "G") {
                      rows[number]["source"] = cb[Object.keys(cb)[i]].v;
                    }
                  } else {
                    if (letter == "A") {
                      rows[number] = {};
                      rows[number]["sheet_name"] = cb[Object.keys(cb)[i]].v;
                    }
                  }
                }
              }
            }
          }
          // res.status(200).send(sheet);

          MongoClient.connect(URL, function(err, db) {
            if (err) throw err;
            var collection = db.collection("testFiles");
            collection
              .insert({
                name: fileName,
                filename: filename,
                file_uploaded: new Date(),
                file_updated: new Date(),
                user_id: userId,
                project_id: projectId,
                rows: rows,
                sheet:sheet,
                title: title
              })
              .then(
                result => {
                  res.status(200).json({
                    message: "Upload Successful"
                  });
                },
                err => {
                  res.status(401).send({ error: err });
                }
              );
          });
        
      
    
  });
});


async function fake_background_job(pusher_channel) {
  pusher.trigger(pusher_channel, "upload", {
    message: "Starting provisioning your account #{name}",
    progress: 30
  });
  await sleep(3000);
  pusher.trigger(pusher_channel, "upload", {
    message: "Sorry, It's taking a bit of time...",
    progress: 30
  });
  await sleep(2000);
  pusher.trigger(pusher_channel, "upload", {
    message: "almost there, adding the demo data...",
    progress: 60
  });
  await sleep(4000);
  pusher.trigger(pusher_channel, "upload", {
    message: "Polishing your new account...",
    progress: 90
  });
  await sleep(3000);
  pusher.trigger(pusher_channel, "upload", {
    message:
      "Everything is ready for you #{name}! did it feels like 12 seconds?",
    progress: 100
  });
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
//--------------------------------
// Upload TEST
//--------------------------------

router.post("/test", (req, res, next) => {
  upload(req, res, function(err) {
    var filename = req.file.filename;
    fs.move("./tmp/" + filename, "./uploads/test/" + filename, function(err) {
      // if (err) {
      //   fs.remove("./tmp/" + filename);
      //   fs.remove("./uploads/test/" + filename);
      //   res.status(401).json({
      //     errors: {
      //       form: "File Exists"
      //     }
      //   });
      // }else{

      var workbook = XLSX.readFile("./uploads/test/" + filename);
      var sheet = JSON.parse(CircularJSON.stringify(workbook));
      var cb = sheet.Sheets.CommonBrain;
      var sheetNames = [];
      var rows = {};
      var title;
      for (var i = 0; i < Object.keys(cb).length; i++) {
        var key = Object.keys(cb)[i];
        var letter = key.charAt(0);
        var number = key.substr(1);
        if (letter == "A" && number == 1) {
          title = cb[Object.keys(cb)[i]].v;
        }
        if (letter.match(/[a-z]/i)) {
          var row = {};

          if (number > 2) {
            number = parseInt(number);
            if (Object.keys(cb[Object.keys(cb)[i]]).length > 0) {
              if (rows[number] != null) {
                if (letter == "A") {
                  rows[number]["sheet_name"] = cb[Object.keys(cb)[i]].v;
                }
                if (letter == "B") {
                  rows[number]["tab_name"] = cb[Object.keys(cb)[i]].v;
                }
                if (letter == "C") {
                  rows[number]["major_category"] = cb[Object.keys(cb)[i]].v;
                }
                if (letter == "D") {
                  rows[number]["spec_category"] = cb[Object.keys(cb)[i]].v;
                }
                if (letter == "E") {
                  rows[number]["value"] = cb[Object.keys(cb)[i]].v;
                }
                if (letter == "F") {
                  rows[number]["hover"] = cb[Object.keys(cb)[i]].v;
                }
                if (letter == "G") {
                  rows[number]["source"] = cb[Object.keys(cb)[i]].v;
                }
              } else {
                if (letter == "A") {
                  rows[number] = {};
                  rows[number]["sheet_name"] = cb[Object.keys(cb)[i]].v;
                }
              }
            }
          }
        }
      }
      //console.log(rows)
      //console.log(title);
      res.status(200).send(sheet);

      // MongoClient.connect(URL, function(err, db) {
      //   if (err) throw err;
      //   var collection = db.collection("files");
      //   collection
      //     .insert({
      //       name: fileName,
      //       filename:filename,
      //       file_uploaded: new Date(),
      //       file_updated:new Date(),
      //       user_id: userId,
      //       project_id: projectId
      //     })
      //     .then(
      //       result => {
      //         res.status(200).json({
      //           message:"Upload Successful"
      //         })
      //       },
      //       err => {
      //         res.status(401).send({ error: err });
      //       }
      //     );
      // });

      // }
    });
  });
});

//--------------------------------
// Get Files
//--------------------------------

router.get("/:userId/:projectId", (req, res, next) => {
  const userId = req.params.userId;
  const projectId = req.params.projectId;
  MongoClient.connect(URL, function(err, db) {
    if (err) throw err;
    var collection = db.collection("files");
    collection
      .find({ project_id: projectId }, { sheet: 0 })
      .toArray()
      .then(result => {
        res.status(200).send(result);
      });
  });
});

//--------------------------------
// Get File
//--------------------------------

router.get("/:userId/:projectId/:fileId", (req, res, next) => {
  const userId = req.params.userId;
  const projectId = req.params.projectId;
  const fileId = req.params.fileId;

  MongoClient.connect(URL, function(err, db) {
    if (err) throw err;
    var collection = db.collection("files");
    var projects = db.collection('projects');
    Promise.all([
      collection
      .find({ _id: ObjectId(fileId) }, { sheet: 0 })
      .toArray(), 
      projects
      .find({ _id: ObjectId(projectId) })
      .toArray()])
    .then(result=>{
      res.status(200).send({file: result[0], project: result[1]});
    });
  });
});


module.exports = router;
