import ClassDetailsModel from '../models/classDetailsModel.js';
import TryCatch from '../utils/errorHandler.js';

export const getClassDetails = TryCatch(async (req, res) => {
  const { studentId, mentorId } = req.query;

  // Validate input
  if (!studentId && !mentorId) {
    return res.status(400).json({
      success: false,
      message: "Please provide either studentId or mentorId",
    });
  }

  // Determine the query based on provided IDs
  let query = {};
  if (studentId) {
    query.studentId = studentId;
  }
  if (mentorId) {
    query.mentorId = mentorId;
  }

  // Fetch class details based on the query
  const classDetails = await ClassDetailsModel.find(query);

  if (classDetails.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No class details found for the provided ID",
    });
  }

  // Group classes by subject and sort them by date
  const classesBySubject = classDetails.reduce((acc, curr) => {
    const { subjectName } = curr;
    if (!acc[subjectName]) {
      acc[subjectName] = [];
    }
    acc[subjectName].push(curr);
    return acc;
  }, {});

  // Assign class numbers
  const classDetailsWithNumbers = Object.entries(classesBySubject).flatMap(
    ([subjectName, classes]) => {
      // Sort classes by date
      classes.sort((a, b) => new Date(a.classDate) - new Date(b.classDate));

      // Assign numbers to each class
      return classes.map((classDetail, index) => ({
        ...classDetail._doc, // Spread the original document
        classNumber: `${subjectName} Class #${index + 1}`,
      }));
    }
  );

  res.status(200).json({
    success: true,
    data: classDetailsWithNumbers,
  });
});
