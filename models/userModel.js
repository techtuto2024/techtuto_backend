import mongoose from "mongoose";
import { userSchemaZod } from "../schemas/userSchema.js";

export const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your name"],
    maxLength: [30, "Name cannot exceed 30 characters"],
    minLength: [3, "Name should have at least 3 characters"],
  },
  email: {
    type: String,
    required: [true, "Please enter your email"],
    unique: true,
  },
  avatar: {
    type: {
      public_id: String,
      url: String,
    },
    default: {},
  },
  role: {
    type: String,
    default: "",
  },
  userId: {
    type: String,
  },
  password: {
    type: String,
  },
  country: {
    name: {
      type: String,
    },
    timezone: {
      type: String,
      default: "UTC",
    },
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
});

// Middleware to validate with Zod schema
userSchema.pre("save", function (next) {
  const validationResult = userSchemaZod.safeParse(this.toObject());

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors
      .map((err) => err.message)
      .join(", ");
    return next(new Error(`Validation failed: ${errorMessages}`));
  }
  next();
});

const User = mongoose.model("User", userSchema);

export default User;
