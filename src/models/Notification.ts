import mongoose, { Document, Model, Schema } from "mongoose";

export interface INotification extends Document {
  userId:    mongoose.Types.ObjectId;
  type:      "welcome" | "subscription" | "limit_warning" | "agent_created" | "invite_accepted" | "inquiry";
  message:   string;
  isRead:    boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    type: {
      type:    String,
      enum:    ["welcome", "subscription", "limit_warning", "agent_created", "invite_accepted", "inquiry"],
      required: true,
    },
    message: {
      type:    String,
      required: true,
    },
    isRead: {
      type:    Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Notification: Model<INotification> =
  (mongoose.models.Notification as Model<INotification>) ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;