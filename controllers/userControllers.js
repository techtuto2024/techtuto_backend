import mongoose from "mongoose";
import cloudinary from "cloudinary";
import handlebars from "handlebars";
import fs from "fs";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { userSchema } from "../models/userModel.js";

import getDataUrl from "../utils/urlGenerator.js";
import TryCatch from "../utils/errorHandler.js";
import { sendEmail } from "../utils/emailSender.js";
import generateJwt from "../utils/jwtGenerator.js";
import {
  checkExistingUserAcrossCollections,
  getDynamicUserModel,
} from "../utils/dynamicCollectionHandler.js";

// User signup and registration
export const registerUser = TryCatch(async (req, res) => {
  const { name, email, role } = req.body;
  const file = req.file;

  // Check for missing fields
  if (!name || !email || !role) {
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
  for (const collectionName of collections) {
    const model =
      mongoose.models[collectionName] ||
      mongoose.model(collectionName, userSchema);
    const existingUser = await model.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: "User with this email already exists in another role",
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
    console.log(password, typeof password);
    console.log(user.password, typeof user.password);
    console.log("Password Matched:", isPasswordMatched);

    if (!isPasswordMatched) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    generateJwt(user._id, res);

    res.status(200).json({
      success: true,
      message: "User logged in",
      user,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      message: "An error occurred during login",
    });
  }
});

// User logout
export const logoutUser = TryCatch(async (req, res) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

// Send class details
export const sendClassDetails = TryCatch(async (req, res) => {
  const { studentId, mentorId, classLink, classDate, classTime } = req.body;

  // Validate input
  if (!studentId || !mentorId || !classLink || !classDate || !classTime) {
    return res.status(400).json({
      success: false,
      message: "Please provide studentId, mentorId, and classLink",
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

  // Read the email template
  const emailTemplate = fs.readFileSync(
    "views/classDetailsEmailTemplate.html",
    "utf-8"
  );
  const compiledTemplate = handlebars.compile(emailTemplate);

  // Prepare email content
  const emailSubject = "Class Details from TechTuto";

  // Function to send personalized email
  const sendPersonalizedEmail = async (recipient) => {
    const emailData = {
      recipientName: recipient.name,
      classLink: classLink,
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
  await sendPersonalizedEmail(student);
  await sendPersonalizedEmail(mentor);

  res.status(200).json({
    success: true,
    message: "Class details sent successfully to both student and mentor",
    classLink,
    classDate,
    classTime,
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
