import express from "express";
import dotenv from "dotenv";
import cloudinary from "cloudinary";
import cookieParser from "cookie-parser";
import cors from "cors";

import { connectDB } from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import classDetailsRoutes from "./routes/classDetailsRoutes.js";
import razorpayRoutes from "./routes/razorpayRoutes.js";

const app = express();

dotenv.config({ path: "./.env" });

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ],
    credentials: true,
  })
);

app.use("/api/v1/user", userRoutes);
app.use("/api/v1/user", classDetailsRoutes);
app.use("/api/v1/razorpay", razorpayRoutes);

const port = process.env.PORT;

app.get("/", (req, res) => {
  res.send(
    "Hello World from TechTuto"
  )
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  connectDB();
});
