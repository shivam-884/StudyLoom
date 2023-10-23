const mongoose = require("mongoose");
const mailSender = require("../utils/mailSender");
const emailTemplate = require("../mail/templates/emailVerificationTemplate");

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now(),
        expires:  5*60,
    }
});


// a function to send email
async function sendVerificationEmail(email, otp) {
    try{
        const title = "Verification of Email from StudyLoom";
        const mailResponse = await mailSender(email, title, emailTemplate(otp));
        console.log("Email sent successfully", mailResponse);
    }catch(error) {
        console.log("Error occur while sending email", error);
        throw error;
    }
}


otpSchema.pre("save", async function(next) {
    console.log("New document saved to database");
    
    // only send an email when a new document is created
    if (this.isNew) {
		await sendVerificationEmail(this.email, this.otp);
	}
    next();
})



module.exports = mongoose.model("OTP", otpSchema);