const Profile = require("../models/Profile");
const User = require("../models/User");
const { uploadImageToCloudinary } = require("../utils/imageUploader");


exports.updateProfile = async (req, res) => {
    try{
        // get data
        const {dateOfBirth="", about="", contactNumber, gender} = req.body;
        // user id
        const id= req.user.id;
        // validation
        if(!contactNumber || !gender) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }
        // find profile
        const userDetails = await User.findById(id);
        const profileDetails = await Profile.findById(userDetails.additionalDetails);

        // update profile
        profileDetails.dateOfBirth = dateOfBirth;
        profileDetails.about = about;
        profileDetails.gender = gender;
        profileDetails.contactNumber = contactNumber;
        await profileDetails.save();
        // return response
        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            profileDetails,
        });

    }catch(error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}



// delete Account
// Explore -> How can we scheduled this deletion
// Explore -> Crown job
exports.deleteAccount = async (req,res) => {
    try{
        //get id
        const id = req.user.id;
        // validation
        const userDetails = await User.findById({_id: id});
        if(!userDetails) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        // delete profile first
        await Profile.findByIdAndDelete({_id: userDetails.additionalDetails});
        // TODO: unenroll user from all enrolled courses
        // delete user
        await User.findByIdAndDelete({_id: id});

        // return response
        return res.status(200).json({
            success: true,
            message: "User successfully deleted",
        })
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "User cannot be deleted",
            error: error.message,
        })
    }
}


exports.getAllUserDetails = async (req,res) => {
    try{
        // get id
        const id = req.user.id;
        // validation and find user details
        const userDetails = await User.findById(id).populate("additionalDetails").exec();
        
        //return response
        return res.status(200).json({
            success: true,
            message: "User data fetched successfully",
            data: userDetails,
        });
    }catch(error){
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}



exports.updateDisplayPicture = async (req, res) => {
    try {
      const displayPicture = req.files.displayPicture
      const userId = req.user.id
      const image = await uploadImageToCloudinary(
        displayPicture,
        process.env.FOLDER_NAME,
        1000,
        1000
      )
      console.log(image)
      const updatedProfile = await User.findByIdAndUpdate(
        { _id: userId },
        { image: image.secure_url },
        { new: true }
      )
      res.send({
        success: true,
        message: `Image Updated successfully`,
        data: updatedProfile,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      })
    }
};
  
exports.getEnrolledCourses = async (req, res) => {
    try {
      const userId = req.user.id
      const userDetails = await User.findOne({
        _id: userId,
      })
        .populate("courses")
        .exec()
      if (!userDetails) {
        return res.status(400).json({
          success: false,
          message: `Could not find user with id: ${userDetails}`,
        })
      }
      return res.status(200).json({
        success: true,
        data: userDetails.courses,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      })
    }
};