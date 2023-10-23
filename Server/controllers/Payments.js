const {instance} = require("../config/razorpay");
const Course = require("../models/Course");
const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const {courseEnrollmentEmail} = require("../mail/templates/courseEnrollmentEmail");
const { default: mongoose } = require("mongoose");


// capture the payment and initiate the razorpay
exports.capturePayment = async (req,res) => {
    // get course id and user id
    const {course_id} = req.body;
    const userId = req.user.id;
    // validation
    // validCourseID
    if(!course_id) {
        return res.json({
            success: false,
            message: "Please provide valid courseID",
        });
    };
    // valid courseDetail
    let course;
    try{
        course = await Course.findById(course_id);
        if(!course){
            return res.json({
                success: false,
                message: "Could not find the course",
            });
        }
        // user already pay for the same course
        const uid = new mongoose.Types.ObjectId.apply(userId);
        if(course.studentsEnrolled.includes(uid)){
            return res.json({
                success: false,
                message: "Student is alredy enrolled",
            });
        }
    }catch(error){
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }

    // order create
    const amount = course.price;
    const currency = "INR";

    const options = {
        amount: amount * 100,
        currency,
        receipt: Math.random(Date.now()).toString(),
        notes: {
            courseId: course_id,
            userId,
        }
    };
    
    try{
        // initiate the payment using razorpay
        const paymentResponse = await instance.orders.create(options);
        console.log(paymentResponse);
        // return response
        return res.status(200).json({
            success: true,
            courseName: course.courseName,
            courseDescription: course.courseDescription,
            thumbnail: course.thumbnail,
            orderId: paymentResponse.id,
            currency: paymentResponse.currency,
            amount: paymentResponse.amount,
        });
    }catch(error){
        console.log(error);
        res.json({
            success: false,
            message: "Could not initiate order",
        });
    }

}



// verify Signature of Razorpay and Server
exports.verifySignature = async (req, res) => {
    const webHookSecret = "12345678";

    const signature = req.headers["x-razorpay-signature"];

    const shasum = crypto.createHmac("sha256", webHookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if(signature === digest){
        console.log("Payment is authorized");

        const {courseId, userId} = req.body.payload.payment.entity.notes;

        try{
            // fulfil the action

            // find the course and enroll the student in it
            const enrolledCourse = await Course.findOneAndUpdate(
                                                {_id: courseId},
                                                {$push: {studentsEnrolled: userId}},
                                                {new: true},
            );

            if(!enrolledCourse) {
                return res.status(500).json({
                    success: false,
                    message: "Course not found",
                });
            }

            console.log(enrolledCourse);

            // find the student and add the course to their list enrolled courses
            const enrolledStudent = await User.findOneAndUpdate(
                                        {_id: userId},
                                        {$push: {courses: courseId}},
                                        {new: true},
            );
            console.log(enrolledStudent);

            // mail send to the student for confiramation
            const emailResponse = await mailSender(
                enrolledStudent.email,
                "Congratulations form StudyLoom",
                "Congratulations, you are onboarded into new Course on StudyLoom"
            );

            console.log(emailResponse);
            return res.status(200).json({
                success: true,
                message: "Signature Verified and Course added",
            })
        }catch(error){
            console.log(error);
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }else{
        return res.status(400).json({
            success: false,
            message: "Invalid Request",
        })
    }
}