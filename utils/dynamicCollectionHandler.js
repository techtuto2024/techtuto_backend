import mongoose from "mongoose";
import { userSchema } from "../models/userModel.js";

const models = {};

// Function to get or create a dynamic model based on the role/collection name
export const getDynamicUserModel = (collectionName) => {
  if (models[collectionName]) {
    return models[collectionName];
  }

  const model = mongoose.model(collectionName, userSchema);
  models[collectionName] = model;
  return model;
};

// Function to check if a user already exists across multiple collections
export const checkExistingUserAcrossCollections = async (query, collections) => {
  for (const collectionName of collections) {
    console.log(`Searching in collection: ${collectionName} with query:`, query);
    const model = getDynamicUserModel(collectionName);
    const user = await model.findOne(query);
    if (user) {
      console.log(`Found user in collection: ${collectionName}`, user);
      return user;
    }
  }
  console.log("User not found in any collection");
  return null;
};