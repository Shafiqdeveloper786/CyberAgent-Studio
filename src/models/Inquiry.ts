import mongoose, { Schema, Document } from "mongoose";

export interface IInquiry extends Document {
  type: "internal" | "external";
  tenantId?: string;
  contactEmail: string;
  contactName: string;
  subject: string;
  category: string;
  message: string;
  chatContext: { role: string; content: string; timestamp: string }[];
  status: "pending" | "in-progress" | "resolved";
  isInternal?: boolean;
  replies: { sender: "admin" | "user" | "visitor"; message: string; timestamp: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const InquirySchema = new Schema<IInquiry>(
  {
    type: {
      type: String,
      enum: ["internal", "external"],
      default: "external",
    },
    tenantId: {
      type: String,
      index: true,
    },
    contactEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    contactName: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: "general",
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    chatContext: [
      {
        role: String,
        content: String,
        timestamp: String,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved"],
      default: "pending",
    },
    isInternal: {
      type: Boolean,
      default: false,
    },
    replies: [
      {
        sender: {
          type: String,
          enum: ["admin", "user", "visitor"],
          required: true,
        },
        message: {
          type: String,
          required: true,
        },
        timestamp: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

InquirySchema.index({ tenantId: 1, createdAt: -1 });
InquirySchema.index({ status: 1 });
InquirySchema.index({ isInternal: 1 });

export default mongoose.models.Inquiry || mongoose.model<IInquiry>("Inquiry", InquirySchema);