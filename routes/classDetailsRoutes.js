import express from "express";
import { getClassDetails } from "../controllers/classDetailsControllers.js";

const router = express.Router();

router.get("/classdetails", getClassDetails);

export default router;
