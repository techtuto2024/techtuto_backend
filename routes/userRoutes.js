import express from "express";
import uploadFile from "../middlewares/multer.js";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  sendClassDetails,
} from "../controllers/userControllers.js";
import { authorizeRoles, isUserAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", uploadFile, registerUser);
router.post("/login", loginUser);
router.delete("/logout", logoutUser);
router.post(
  "/sendClassDetails",
  isUserAuthenticated,
  authorizeRoles("manager"),
  sendClassDetails
);
router.post("/requestResetPassword", requestPasswordReset);
router.put("/resetPassword/:token", resetPassword);

router.get("/verifytoken", isUserAuthenticated, (req, res) => {
  res.status(200).json({ valid: true });
});
router.get("/currentuser", isUserAuthenticated, getCurrentUser);

export default router;
