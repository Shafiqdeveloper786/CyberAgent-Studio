import mongoose, { Document, Model, Schema } from "mongoose";

export interface IInvitation extends Document {
  email:     string;
  token:     string;
  invitedBy: mongoose.Types.ObjectId;
  plan:      "free" | "pro";
  isUsed:    boolean;
  expiresAt: Date;
  createdAt: Date;
}

const InvitationSchema = new Schema<IInvitation>({
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
    unique:   true,
    index:    true,
  },
  invitedBy: {
    type:     Schema.Types.ObjectId,
    ref:      "User",
    required: true,
  },
  plan: {
    type:    String,
    enum:    ["free", "pro"],
    default: "free",
  },
  isUsed: {
    type:    Boolean,
    default: false,
  },
  expiresAt: {
    type:     Date,
    required: true,
  },
  createdAt: {
    type:    Date,
    default: Date.now,
  },
});

InvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Invitation: Model<IInvitation> =
  (mongoose.models.Invitation as Model<IInvitation>) ||
  mongoose.model<IInvitation>("Invitation", InvitationSchema);

export default Invitation;