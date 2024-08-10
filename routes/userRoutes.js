import express from "express";
import uploadFile from "../middlewares/multer.js";
import { loginUser, registerUser } from "../controllers/userControllers.js";

const router = express.Router();

router.post("/register", uploadFile, registerUser);
router.post("/login", loginUser);

export default router;
