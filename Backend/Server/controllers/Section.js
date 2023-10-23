const Section = require("../models/Section");
const Course = require("../models/Course");

exports.createSection = async(req,res) => {
    try{
        // data fetch
        const {sectionName, courseId } = req.body;
        // data validation
        if(!sectionName || !courseId) {
            return res.status(400).json({
                success: false,
                message: "Missing Properties",
            });
        }
        // create section
        const newSection = await Section.create({sectionName});
        // update course with secion ObjectID
        const updatedCourse = await Course.findByIdAndUpdate(courseId, {$push:{courseContent: newSection._id}}, {new: true})
                                                            .populate({
                                                                path: "courseContent",
                                                                populate: {
                                                                    path: "subSection",
                                                                },
                                                            }).exec();
        //use populate to replace section and subsection both in the updated Course in above line
        // return response
        return res.status(200).json({
            success: true,
            message: "Section Created Successfully",
            updatedCourse,
        });
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Unable to create section, Please try again",
            error: error.message,
        });
    }
}



exports.updateSection = async (req,res) => {
    try{
        // data input
        const {sectionName, sectionId} = req.body;
        // data validation
        if(!sectionName || !sectionId) {
            return res.status(400).json({
                success: false,
                message: "Missing Properties",
            });
        }
        // update data
        const section = await Section.findByIdAndUpdate(sectionId, {sectionName}, {new : true});
        // return response
        return res.status(200).json({
            success: true,
            message: "Section Updated Successfully",
        });
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Unable to update section, Please try again",
            error: error.message,
        });
    }
}




exports.deleteSection = async (req,res) => {
    try{
        // get section id
        const {sectionId} = req.body;
        // find the section and delete
        await Section.findByIdAndDelete( sectionId, {new: true});
        // TODO: do we need to delete the section Id in course schema
        // return response
        return res.status(200).json({
            success: true,
            message: "Section Deleted Successfully",
        });
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Unable to delete section, Please try again",
            error: error.message,
        });
    }
}