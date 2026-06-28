import mongoose, { Document, Model, Schema } from "mongoose";

export interface IVerificationToken extends Document {
  email:       string;
  token:       string;
  expiresAt:   Date;
  createdAt:   Date;
  /** Number of failed verification attempts against this token */
  attempts:    number;
  /** If set, no verification attempts are accepted until this timestamp */
  lockedUntil?: Date;
}

const VerificationTokenSchema = new Schema<IVerificationToken>({
  email: {
    type:      String,
    required:  true,
    lowercase: true,
    trim:      true,
    index:     true,
  },
  token: {
    type:     String,
    required: true,
  },
  expiresAt: {
    type:     Date,
    required: true,
  },
  createdAt: {
    type:    Date,
    default: Date.now,
  },
  attempts: {
    type:    Number,
    default: 0,
  },
  lockedUntil: {
    type:     Date,
    required: false,
  },
});

/* MongoDB auto-deletes documents once expiresAt has passed */
VerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const VerificationToken: Model<IVerificationToken> =
  (mongoose.models.VerificationToken as Model<IVerificationToken>) ||
  mongoose.model<IVerificationToken>("VerificationToken", VerificationTokenSchema);

export default VerificationToken;
