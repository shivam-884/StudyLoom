const Course = require("../models/Course");
const Category = require("../models/Category");
const User = require("../models/User");
const { uploadImageToCloudinary} = require("../utils/imageUploader");

//create Courese handler function
exports.createCourse = async (req,res) => {
    try{
        // get user id from req body
        const userId = req.user.id;
        //fetch data
        let {courseName, courseDescription, whatYouWillLearn, price, tag, category, status, instructions,} = req.body;

        // get thumbnail
        const thumbnail = req.files.thumbnailImage;

        //validation
        if(!courseName || !courseDescription || !whatYouWillLearn || !price || !tag || !thumbnail || !category) {
            return res.status(400).json({
                success: true,
                message: "All fields are required",
            });
        }

        if(!status || status === undefined) {
            status = "Draft";
        }

        //check for instructor
        const instructorDetails = await User.findById(userId, {accountType: "Instructor"});
        console.log("Instructor Details: ", instructorDetails);

        if(!instructorDetails) {
            return res.status(400).json({
                success: false,
                message: "Instructor Details not found"
            });
        }

        //check given tag is valid or not
        const categoryDetails = await Category.findById(category);
        if(!categoryDetails) {
            return res.status(404).json({
                success: false,
                message: "Category details not found"
            });
        }

        // upload thumbnail to cloudinary
        const thumbnailImage = await uploadImageToCloudinary(thumbnail, process.env.FOLDER_NAME);

        // create an entry for new Course
        const newCourse = await Course.create({
            courseName,
            courseDescription,
            instructor: instructorDetails._id,
            whatYouWillLearn,
            price,
            tag: tag,
            category: categoryDetails._id,
            thumbnail: thumbnailImage.secure_url,
            status: status,
            instructions: instructions,
        });

        // add the new course to the user schema of instructor
        await User.findByIdAndUpdate(
            {_id: instructorDetails._id},
            {
                $push: {
                    courses: newCourse._id,
                }
            },
            {new: true},
        );

        //adding the new course to category
        await Category.findByIdAndUpdate(
            {_id: category},
            {
                $push: {
                    courses: newCourse._id,
                },
            },
            {new: true}
        );
        //TODO

        //return response
        return res.status(200).json({
            success: true,
            message: "Course Created Successfully",
            data: newCourse,
        });

    }catch(error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to create course",
        });
    }
};




// get all course handler function

exports.getAllCourses = async (req,res) => {
    try{
        const allCourses = await Courses.find({}, {courseName: true,
                                                    price: true,
                                                    thumbnail: true,
                                                    instructor: true,
                                                    ratingAnsReviews: true,
                                                    studentsEnrolled: true,})
                                                    .populate("instructor")
                                                    .exec();
        return res.status(200).json({
            success: true,
            message: "Data for all courses fetched successfully",
            data: allCourses,
        })
    }catch(error){
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Cannot fetch course data",
            error:error.message,
        })
    }
}



// getCourseDetails
exports.getCourseDetails = async (req, res) => {
    try{
        //get id
        const {courseId} = req.body;
        // find course details
        const courseDetails = await Course.find({_id: courseId}).populate(
                                                                    {
                                                                        path: "instructor",
                                                                        populate:{path:"additionalDetails",},
                                                                    }
                                                                ).populate("category")
                                                                .populate("ratingAndReviews")
                                                                .populate({
                                                                    path: "courseContent",
                                                                    populate: {
                                                                        path: "subSection",
                                                                    }
                                                                }).exec();

                // validation
                if(!courseDetails) {
                    return res.status(400).json({
                        success: false,
                        message: `Could not find the course with ${courseId}`,
                    });
                }

                // return response
                return res.status(200).json({
                    success: true,
                    message: "Course Details fetched successfully",
                    data: courseDetails,
                });
    }catch(error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}