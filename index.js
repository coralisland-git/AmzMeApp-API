require('dotenv').config();
const http = require("http");
var app = require("./app");
var cron = require('node-cron');
var MongoClient = require("mongodb").MongoClient;
var ObjectId = require("mongodb").ObjectId;
var OneSignal = require('onesignal-node');
var URL = process.env.MONGO_URL;

const port = process.env.PORT || 3000;

const server = http.createServer(app);
// var io = require("socket.io")(server);
// io.origins("*:*");
// io.on("connection", function(socket) {
//   console.log("a user connected");
// });

// const Pusher = require("pusher");

// const pusher = new Pusher({
//   appId: "528462",
//   key: "edc0fafa92d65aa9bace",
//   secret: "f5f7bb64d29de2bb3092",
//   cluster: "us2",
//   encrypted: true
// });

var myClient = new OneSignal.Client({    
   userAuthKey: 'MjljYzViY2MtOTY1YS00MmI0LTk5ZDgtODU4MzlkZDNkZmEz',    
   app: { appAuthKey: 'OTZmZTcwZDYtMWI1MC00NmE1LThlMjItODllZjg3MjUyMTk3', appId: '0b6427d6-620b-457e-bd39-2cb8058ff542' }
});  

// order.OrderTotal.Amount
// order.OrderTotal.CurrencyCode

cron.schedule('5 * * * *', () => {
	MongoClient.connect(URL, function(err, db) {
	    if (err) throw err;
	    var collection = db.collection("users");
	    var users = collection
			.find({})
			.toArray()
			.then(result => {
		        result.map( (res) => {
					var amazonMws = require('amazon-mws')(res['aws_access_key_id'], res['secret_key']);	
					// var diff = Math.abs(new Date() - new Date(res['last_date']));
					// var minutes = Math.floor((diff/1000)/60);
		         	amazonMws.orders.search({
					    'Version': '2013-09-01',
					    'Action': 'ListOrders',
					    'SellerId': res['seller_id'],
					    // 'MWSAuthToken': 'MWS_AUTH_TOKEN',
		             	'MarketplaceId.Id.1': res['market_place_id'],
					    'LastUpdatedAfter': res['last_date']
					}, function (error, response) {
					    if (error) {
					        console.log('error ', error);
					        return;
					    }
					    // response.Orders.Order.map(console.log);
				       	response.Orders.Order.map( (order) => {
							var notification = new OneSignal.Notification({    
							    contents: {    
							        en: "Test notification",
							    }
							});  
							// <quantity> <product name > for <amount> <currency>. 
							notification.postBody["filters"] = [{"field": "tag", "key": "userId", "relation": "=" ,"value": ObjectId(res['_id'])}];
							notification.postBody["included_segments"] = ["Active Users"];    
							notification.postBody["excluded_segments"] = ["Banned Users"];
							notification.postBody["data"] = order;
							myClient.sendNotification(notification)
						    .then(function (response) {
						        console.log(response.data, response.httpResponse.statusCode);
						    })
						    .catch(function (err) {
						        console.log('Something went wrong...', err);
						    });
						});
					});
					delete res.last_date;
				    collection
			      	.update(
				        { _id: ObjectId(res['_id']) },
				        { last_date: new Date(), ...res }
			      	)
	        	})
	      	});
  	});
});

console.log("running on http://localhost:" + port);
server.listen(port);
