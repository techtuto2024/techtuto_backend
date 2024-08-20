import mongoose from "mongoose";

const classDetailsSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  mentorId: { type: String, required: true },
  classLink: { type: String, required: true },
  classDate: { type: String, required: true },
  classTime: { type: String, required: true },
  studentTimezone: { type: String, required: true },
  mentorTimezone: { type: String, required: true },
  studentClassDate: { type: String, required: true },
  studentClassTime: { type: String, required: true },
  mentorClassDate: { type: String, required: true },
  mentorClassTime: { type: String, required: true },
});

const ClassDetailsModel = mongoose.model("ClassDetails", classDetailsSchema);

export default ClassDetailsModel;
