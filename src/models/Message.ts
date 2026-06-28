import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IMessage extends Document {
  agentId:   Types.ObjectId;
  text?:     string;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    agentId: {
      type:     Schema.Types.ObjectId,
      ref:      "Agent",
      required: true,
      index:    true,
    },
    text: {
      type:     String,
      required: false,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Message: Model<IMessage> =
  (mongoose.models.Message as Model<IMessage>) ||
  mongoose.model<IMessage>("Message", MessageSchema);

export default Message;
