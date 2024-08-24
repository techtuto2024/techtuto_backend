import jwt from "jsonwebtoken";
import { getDynamicUserModel } from "../utils/dynamicCollectionHandler.js";
import TryCatch from "../utils/errorHandler.js";

// Middleware to check if the user is authenticated
export const isUserAuthenticated = TryCatch(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: "Please login to access this resource",
    });
  }

  const token = authHeader.split(' ')[1];
  const decodedData = jwt.verify(token, process.env.JWT_SECRET);

  const collections = ["students", "mentors", "managers"];
  let user = null;

  for (const collectionName of collections) {
    const model = getDynamicUserModel(collectionName);
    user = await model.findById(decodedData.id);
    if (user) break;
  }

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "User not found",
    });
  }

  req.user = user;
  next();
});


// Middleware to authorize roles, independent of authentication
export const authorizeRoles = (...roles) => {
  return TryCatch(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: "Please login to access this resource",
      });
    }

    const token = authHeader.split(' ')[1];
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    const collections = ["students", "mentors", "managers"];
    let user = null;

    for (const collectionName of collections) {
      const model = getDynamicUserModel(collectionName);
      user = await model.findById(decodedData.id);
      if (user) break;
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role: ${user.role} is not allowed to access this resource`,
      });
    }

    req.user = user;
    next();
  });
};