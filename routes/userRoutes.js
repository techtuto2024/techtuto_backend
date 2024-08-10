import express from "express";
import uploadFile from "../middlewares/multer.js";
import {
  loginUser,
  logoutUser,
  registerUser,
  sendClassDetails,
} from "../controllers/userControllers.js";
import { authorizeRoles, isUserAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.post(
  "/register",
  uploadFile,
  registerUser
);
router.post("/login", loginUser);
router.delete("/logout", logoutUser);
router.post("/sendClassDetails",isUserAuthenticated,authorizeRoles("manager"), sendClassDetails)

export default router;
