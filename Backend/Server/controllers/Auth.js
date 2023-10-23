const User = require("../models/User");
const OTP = require("../models/OTP");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mailSender = require("../utils/mailSender");
const { passwordUpdated } = require("../mail/templates/passwordUpdate");
const Profile = require("../models/Profile");
require("dotenv").config();


// send otp - before signup for email verifcation
exports.sendOtp = async (req, res) => {
    try{
        // fetch email from req body
        const {email} = req.body;
    
        // check if user already exist
        const checkUserPresent = await User.findOne({email});
    
        // if user already exist then return res
        if(checkUserPresent) {
            return res.status(401).json({
                success: false,
                message: "User alredy Registered"
            })
        }

        // otp generation
        var otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
        });
        console.log("Otp Generated : ", otp);

        // check unique otp or not
        const result = await OTP.findOne({otp: otp})

        while(result) {
            otp = otpGenerator.generate(6, {
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false
            });
            result = await OTP.findOne({otp: otp})
        }
        

        const otpPayload = {email, otp};

        // create an entry in db for OTP
        const otpBody = await OTP.create(otpPayload);
        console.log(otpBody);

        return res.status(200).json({
            success: true,
            message: "OTP Sent Successfully",
            otp
        });

    }catch(error){
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
};


// signup
exports.signup = async (req, res) => {

    try{

        // fetch data from req body
        const {firstName, lastName, email, password, confirmPassword, accountType, contactNumber, otp} = req.body;
    
        // data validate
        if(!firstName || !lastName || !email || !password || !confirmPassword || !otp) {
            return res.status(403).json({
                success: false,
                message: "All fields are required",
            });
        }
    
        // check both password are matching
        if(password !== confirmPassword) {
            return res.status(400).json({
                success:false,
                message: "Password and Confirm Password are not matched, Please try agian"
            });
        }
    
        // check user already exist or not
        const existingUser = await User.findOne({email});
        if(existingUser) {
            return res.status(400).json({
                success: false,
                message: "User is already Registered"
            });
        }
    
        // find the most recent otp for user
        const recentOtp = await OTP.find({email}).sort({createdAt: -1}).limit(1);
        console.log("Recent Otp " , recentOtp);
    
        // validate otp
        if(recentOtp.length == 0) {
            // OTP not found
            return res.status(400).json({
                success: false,
                message: "OTP not found"
            })
        } else if(recentOtp[0].otp !== otp) {
            // invalid otp
            return res.status(400).json({
                success:false,
                message: 'Invalid OTP'
            })
        }
    
        // password Hash
        const hashedPassword = await bcrypt.hash(password, 10);

        // create the user
		let approved = "";
		approved === "Instructor" ? (approved = false) : (approved = true);
    
        // Create entry in db
        const profileDetails = await Profile.create({
            gender: null,
            dateOfBirth: null,
            about: null,
            contactNumber: null
        });
    
        const user = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            accountType: accountType,
            contactNumber,
            approved : approved,
            additionalDetails: profileDetails._id,
            image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName}%20${lastName}`
        });

        // return res
        return res.status(200).json({
            success: true,
            message: "User is registered successfully",
            user,
        });

    }catch(error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "User cannot be registered, Please try again",
        })
    }
}





// login
exports.login = async (req,res) => {
    try{
        // get data from req body
        const {email, password} = req.body;

        // validation of data
        if(!email || !password) {
            return res.status(403).json({
                success: true,
                message: "All fields are required, Please try again",
            });
        }

        // check user exist or not
        const user = await User.findOne({email}).populate("additionalDetails");

        if(!user) {
            return res.status(401).json({
                success: false,
                message: "User is not registered, please signup first",
            });
        }

        // generate jwt, after matching password
        if(await bcrypt.compare(password, user.password)) {
            const payload = {
                email: user.email,
                id: user._id,
                accountType: user.accountType,
            }
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: "48h"
            });
            // save token to user document in database
            user.token = token;
            user.password = undefined;

            // create cookie and send response
            const options = {
                expires: new Date(Date.now() + 3 * 24 * 60* 60 *1000),
                httpOnly: true,
            }
    
            res.cookie("token", token, options).status(200).json({
                success: true,
                token,
                user,
                message: "Logged in successfully",
            });
        }else {
            return res.status(401).json({
                success: false,
                message: 'Password is incorrect',
            });
        }

    }catch(error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Login failure, Please try again",
        });
    }
}




// chagne password
exports.changePassword = async (req,res) => {
    try{
        // get data from req body
        const userId = req.user.id;
        // get user details
        const userDetails = await User.findOne(userId);
        // getOldPassword, newPassword, confirmNewPassowrd
        const {oldPassword, newPassword, confirmNewPassword} = req.body;
        // validate
        const isPasswordMatch = await bcrypt.compare(oldPassword, userDetails.password);

        if(!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: "The password you entered is incorrect",
            });
        }

        // match newPassword and confirmNewPassword
        if(newPassword !== confirmNewPassword) {
            return res.status(401).json({
                success: false,
                message: "newPassword and confirm new passowrd does not match",
            });
        }

        // update password in database
        const encryptedPassword = await bcrypt.hash(newPassword, 10);
        const updateUserDetails = await User.findByIdAndUpdate(userId, {password: encryptedPassword}, {new: true});

        // send mail - password updated
        try{
            const emailResponse = await mailSender(
                updateUserDetails.email,
                passwordUpdated(
                    updateUserDetails.email,
                    `Password updated successfully for ${updateUserDetails.firstName} ${updateUserDetails.lastName}`
                )
            );
            console.log("Email sent successfully:", emailResponse);
        }catch(error) {
            console.error("Error occurred while sending email:", error);
            return res.status(500).json({
                success: false,
                message: "Error occurred while sending email",
                error: error.message,
            });
        }
        // return response
        return res
			.status(200)
			.json({ success: true, message: "Password updated successfully" });
    }catch(error) {
        console.error("Error occurred while updating password:", error);
		return res.status(500).json({
			success: false,
			message: "Error occurred while updating password",
			error: error.message,
		});
    }
}