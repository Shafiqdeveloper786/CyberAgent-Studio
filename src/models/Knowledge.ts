import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IKnowledge extends Document {
  agentId:  Types.ObjectId;
  userId:   Types.ObjectId;
  fileName: string;
  fileType: "pdf" | "docx" | "doc" | "txt" | "md" | "url";
  fileUrl:  string;
  fileSize: number;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeSchema = new Schema<IKnowledge>(
  {
    agentId: {
      type:     Schema.Types.ObjectId,
      ref:      "Agent",
      required: true,
      index:    true,
    },
    userId: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    fileName: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 260,
    },
    fileType: {
      type: String,
      enum: ["pdf", "docx", "doc", "txt", "md", "url"],
      default: "txt",
    },
    /* Cloud URL from Uploadthing / Cloudinary — empty until file hosting is wired */
    fileUrl: {
      type:    String,
      default: "",
    },
    /* Bytes for files, 0 for URLs */
    fileSize: {
      type:    Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Knowledge: Model<IKnowledge> =
  (mongoose.models.Knowledge as Model<IKnowledge>) ||
  mongoose.model<IKnowledge>("Knowledge", KnowledgeSchema);

export default Knowledge;
