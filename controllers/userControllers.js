import mongoose from "mongoose";
import cloudinary from "cloudinary";
import handlebars from "handlebars";
import fs from "fs";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import moment from "moment-timezone";

import { userSchema } from "../models/userModel.js";

import getDataUrl from "../utils/urlGenerator.js";
import TryCatch from "../utils/errorHandler.js";
import { sendEmail } from "../utils/emailSender.js";
import generateJwt from "../utils/jwtGenerator.js";
import {
  checkExistingUserAcrossCollections,
  getDynamicUserModel,
} from "../utils/dynamicCollectionHandler.js";
import ClassDetailsModel from "../models/classDetailsModel.js";

// User signup and registration
export const registerUser = TryCatch(async (req, res) => {
  const { name, email, role, countryName, timezone } = req.body;
  const file = req.file;

  // Check for missing fields
  if (!name || !email || !role || !countryName || !timezone) {
    return res.status(400).json({
      message: "Please enter all details",
    });
  }

  // Validate role
  const validRoles = ["student", "mentor", "manager"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      message: "Invalid role",
    });
  }

  // Define collection names
  const collections = ["students", "mentors", "managers"];

  // Check across all collections if the email already exists
  let existingUsers = [];
  for (const collectionName of collections) {
    const model =
      mongoose.models[collectionName] ||
      mongoose.model(collectionName, userSchema);
    const existingUser = await model.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "User with this email already exists",
      });
    }
  }

  // Generate custom user ID and password
  const userId = `${email.split("@")[0] + "_".toLowerCase()}${role}@techtuto`;
  const password = `${
    name.split(" ")[0].toLowerCase() +
    Math.floor(Math.random() * 10) +
    Math.floor(Math.random() * 10)
  }`;
  const hashedPassord = await bcrypt.hash(password, 10);

  // Define collection name based on role
  const collectionName =
    role === "student"
      ? "students"
      : role === "mentor"
      ? "mentors"
      : role === "manager"
      ? "managers"
      : "";

  const dynamicUserModel = getDynamicUserModel(collectionName);

  // Handle file upload and cloudinary integration
  let profile = {};
  if (file) {
    const fileUrl = getDataUrl(file);
    const myCloud = await cloudinary.v2.uploader.upload(fileUrl.content, {
      folder: "avatars",
    });
    profile = {
      id: myCloud.public_id,
      url: myCloud.secure_url,
    };
  }

  // Create user in the correct collection
  const user = await dynamicUserModel.create({
    name,
    email,
    avatar: profile,
    role,
    userId,
    password: hashedPassord,
    country: {
      name: countryName,
      timezone: timezone,
    },
  });

  const subject = `Welcome to TechTuto, ${name}!`;
  const emailTemplate = fs.readFileSync(
    "views/registrationEmailTemplate.html",
    "utf-8"
  );
  const compiledTemplate = handlebars.compile(emailTemplate);
  const emailData = {
    name: user.name,
    email: user.email,
    password: password,
    role: user.role
  };
  const htmlContent = compiledTemplate(emailData);

  await sendEmail({
    email: user.email,
    subject: subject,
    message: htmlContent,
    isHtml: true,
  });

  res.status(200).json({
    message: "User registered successfully",
    user,
  });
});

// User Login
export const loginUser = TryCatch(async (req, res) => {
  const { email, password } = req.body;

  // Check for missing fields
  if (!email || !password) {
    return res.status(400).json({
      message: "Please enter all details",
    });
  }

  try {
    // Define the collections
    const collections = ["students", "mentors", "managers"];

    // Check across all collections
    const user = await checkExistingUserAcrossCollections(
      { email },
      collections
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const token = generateJwt(user._id, res);

    res.status(200).json({
      success: true,
      message: "User logged in",
      token,
      user,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      message: "An error occurred during login",
    });
  }
});

// Get currently logged in user
export const getCurrentUser = TryCatch(async (req, res) => {
  // `req.user` should already be populated by the `isAuthenticated` middleware
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  }

  res.status(200).json({
    success: true,
    user: req.user,
  });
});

// User logout
export const logoutUser = TryCatch(async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false, // Only use secure in production
    sameSite: "lax", // Use strict after deploying
    path: "/",
    // domain: "domain.com" Specify domain after hosting!
  });
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

// Send class details
const DEFAULT_TIMEZONE = "UTC"; // Fallback timezone if user-provided timezone is invalid

export const sendClassDetails = TryCatch(async (req, res) => {
  const { studentId, mentorId, subjectName, classLink, classDate, classTime } =
    req.body;

  // Validate input
  if (!studentId || !mentorId || !subjectName || !classLink || !classDate || !classTime) {
    return res.status(400).json({
      success: false,
      message: "Please provide all details",
    });
  }

  // Fetch student and mentor details using userId
  const StudentModel = getDynamicUserModel("students");
  const MentorModel = getDynamicUserModel("mentors");

  const student = await StudentModel.findOne({ userId: studentId });
  const mentor = await MentorModel.findOne({ userId: mentorId });

  if (!student || !mentor) {
    return res.status(404).json({
      success: false,
      message: "Student or Mentor not found",
    });
  }

  // Get the timezones from student and mentor details
  const studentTimezone = student.country.timezone || DEFAULT_TIMEZONE;
  const mentorTimezone = mentor.country.timezone || DEFAULT_TIMEZONE;

  // Combine classDate and classTime into a single datetime string in IST
  const classDateTimeIST = moment.tz(
    `${classDate} ${classTime}`,
    "DD-MM-YYYY HH:mm",
    "Asia/Kolkata"
  );

  // Convert the IST datetime to UTC
  const classDateTimeUTC = classDateTimeIST.clone().utc();

  // Convert the UTC datetime to student and mentor's respective timezones
  const studentClassDate = classDateTimeUTC
    .clone()
    .tz(studentTimezone)
    .format("DD-MM-YYYY");
  const studentClassTime = classDateTimeUTC
    .clone()
    .tz(studentTimezone)
    .format("HH:mm");
  const studentTimezoneName = moment.tz(studentTimezone).format("zz"); // Get the full timezone name

  const mentorClassDate = classDateTimeUTC
    .clone()
    .tz(mentorTimezone)
    .format("DD-MM-YYYY");
  const mentorClassTime = classDateTimeUTC
    .clone()
    .tz(mentorTimezone)
    .format("HH:mm");
  const mentorTimezoneName = moment.tz(mentorTimezone).format("zz"); // Get the full timezone name

  // Read the email template
  const emailTemplate = fs.readFileSync(
    "views/classDetailsEmailTemplate.html",
    "utf-8"
  );
  const compiledTemplate = handlebars.compile(emailTemplate);

  // Prepare email content
  const emailSubject = "Class Details from TechTuto";

  // Function to send personalized email
  const sendPersonalizedEmail = async (
    recipient,
    recipientClassDate,
    recipientClassTime,
    recipientTimezoneName
  ) => {
    const emailData = {
      recipientName: recipient.name,
      subjectName: subjectName,
      classLink: classLink,
      classDate: recipientClassDate,
      classTime: `${recipientClassTime} ${recipientTimezoneName}`, // Include timezone with time
    };
    const htmlContent = compiledTemplate(emailData);

    await sendEmail({
      email: recipient.email,
      subject: emailSubject,
      message: htmlContent,
      isHtml: true,
    });
  };

  // Send personalized emails to student and mentor
  await sendPersonalizedEmail(
    student,
    studentClassDate,
    studentClassTime,
    studentTimezoneName
  );
  await sendPersonalizedEmail(
    mentor,
    mentorClassDate,
    mentorClassTime,
    mentorTimezoneName
  );

  // Save class details to the database
  await ClassDetailsModel.create({
    studentId,
    mentorId,
    subjectName,
    classLink,
    classDate,
    classTime,
    studentTimezone,
    mentorTimezone,
    studentClassDate,
    studentClassTime,
    mentorClassDate,
    mentorClassTime,
  });

  res.status(200).json({
    success: true,
    message: "Class details sent successfully to both student and mentor",
    classLink,
    subjectName,
    studentClassDate,
    studentClassTime,
    mentorClassDate,
    mentorClassTime,
  });
});

// Request Password Reset
export const requestPasswordReset = TryCatch(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const collections = ["students", "mentors", "managers"];
  const user = await checkExistingUserAcrossCollections({ email }, collections);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(20).toString("hex");
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set token expiration (1 hour from now)
  const resetPasswordExpire = Date.now() + 3600000; // 1 hour

  // Save token to user document
  const UserModel = getDynamicUserModel(user.role + "s");
  await UserModel.findByIdAndUpdate(user._id, {
    resetPasswordToken,
    resetPasswordExpire,
  });

  // Create reset URL
  const resetUrl = `${process.env.FRONTEND_URL}/resetPassword/${resetToken}`;

  // Email content
  const message = `
    You are receiving this email because you (or someone else) has requested the reset of a password. 
    Please make a PUT request to: \n\n ${resetUrl}
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: "Password Reset Request",
      message,
    });

    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return res.status(500).json({ message: "Email could not be sent" });
  }
});

// Reset Password
export const resetPassword = TryCatch(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token || !password) {
    return res
      .status(400)
      .json({ message: "Token and new password are required" });
  }

  // Hash token
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const collections = ["students", "mentors", "managers"];
  const user = await checkExistingUserAcrossCollections(
    {
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    },
    collections
  );

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  // Set new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const UserModel = getDynamicUserModel(user.role + "s");
  await UserModel.findByIdAndUpdate(user._id, {
    password: hashedPassword,
    resetPasswordToken: undefined,
    resetPasswordExpire: undefined,
  });

  res.status(200).json({ message: "Password reset successful" });
});
