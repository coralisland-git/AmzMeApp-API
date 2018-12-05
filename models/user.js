const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
	_id: mongoose.Schema.Types.ObjectId,
	email: String,
	seller_id: String,
	market_place_id: String,
	secret_key: String,
	aws_access_key_id: String,
	last_date : Date
});

module.exports = mongoose.model("User", userSchema);
