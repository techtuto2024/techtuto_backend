import mongoose from "mongoose";
import TryCatch from "../utils/errorHandler.js";

export const connectDB = TryCatch(async (req, res) => {
  await mongoose.connect(process.env.DB_URL, {
    dbName: "TechTuto",
  });
  console.log("DB connected");
});
