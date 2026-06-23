import mongoose, { Document, Model, Schema } from "mongoose";

/* ── Interface ── */
export interface IUser extends Document {
  name:         string;
  email:        string;
  image?:       string;
  role:         "user" | "admin";
  subscription: "free" | "starter" | "growth" | "pro" | "enterprise";
  authMethod:   "google" | "email";
  isVerified:   boolean;
  isBlocked:    boolean;
  createdAt:    Date;
  updatedAt:    Date;
}

/* ── Schema ── */
const UserSchema = new Schema<IUser>(
  {
    name: {
      type:     String,
      required: true,
      trim:     true,
    },
    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
      index:     true,
    },
    image: {
      type: String,
    },
    role: {
      type:    String,
      enum:    ["user", "admin"],
      default: "user",
    },
    subscription: {
      type:    String,
      enum:    ["free", "starter", "growth", "pro", "enterprise"],
      default: "free",
    },
    /* ── auth tracking ── */
    authMethod: {
      type:    String,
      enum:    ["google", "email"],
      default: "email",
    },
    isVerified: {
      type:    Boolean,
      default: false,
    },
    isBlocked: {
      type:    Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/* Prevent Mongoose model recompilation during Next.js hot-reload */
const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);

export default User;