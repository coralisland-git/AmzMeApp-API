
module.exports = {
  	secret: "supersecret",
	MAILGUN_API_KEY: process.env.MAILGUN_API_KEY,
	MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN,
	PUBLIC_KEY: process.env.PUBLIC_KEY,
	ADMIN_EMAIL: 'noreply@commonbrain.io',

	MAIL_SUBJECT: {
		'email-confirmation': 'Confirm your email',
		'ofac-search': 'OFAC Search'
	},

	MAIL_CONTEXT: {
		DOMAIN: 'http://18.222.107.103:3000/#/'
	}
}