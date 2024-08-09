import express from "express";
import uploadFile from "../middlewares/multer.js";
import { registerUser } from "../controllers/userControllers.js";

const router = express.Router();

router.post("/signup", uploadFile, registerUser);

export default router;
