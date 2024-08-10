import mongoose from "mongoose";
import cloudinary from "cloudinary";
import handlebars from "handlebars";
import fs from "fs";
import bcrypt from "bcryptjs";

import User, { userSchema } from "../models/userModel.js";
import getDataUrl from "../utils/urlGenerator.js";
import TryCatch from "../utils/errorHandler.js";
import { sendRegistrationEmail } from "../utils/emailSender.js";
import generateJwt from "../utils/jwtGenerator.js";

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

  // Create or get the dynamic model based on role
  const dynamicUserModel =
    mongoose.models[collectionName] ||
    mongoose.model(collectionName, userSchema);

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
  const emailTemplate = fs.readFileSync("views/emailTemplate.html", "utf-8");
  const compiledTemplate = handlebars.compile(emailTemplate);
  const emailData = {
    name: user.name,
    email: user.email,
    password: password,
  };
  const htmlContent = compiledTemplate(emailData);

  await sendRegistrationEmail({
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
    let user = null;

    // Check across all collections
    for (const collectionName of collections) {
      const model =
        mongoose.models[collectionName] ||
        mongoose.model(collectionName, userSchema);
      user = await model.findOne({ email });
      if (user) break; // Exit loop if user is found
    }

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
