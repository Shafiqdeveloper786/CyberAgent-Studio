import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAgent extends Document {
  userId:             Types.ObjectId;
  name:               string;
  persona:            string;
  status:             "active" | "inactive";
  themeColor:         string;
  theme:              string;
  welcomeMessage:     string;
  apiKey:             string;
  messageCount:       number;
  lastMessageAt:      Date | null;
  /* ── Free-plan daily quota tracking ── */
  dailyMessageCount:  number;   // resets each UTC day
  dailyResetDate:     string;   // "YYYY-MM-DD" UTC — when counter was last zeroed
  limitEmailSentDate: string;   // "YYYY-MM-DD" UTC — prevents duplicate alert emails
  dailyLimit:         number;
  isUnlimited:        boolean;
  createdAt:          Date;
  updatedAt:          Date;
}

const AgentSchema = new Schema<IAgent>(
  {
    userId: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    name: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 80,
    },
    persona: {
      type:     String,
      required: true,
      trim:     true,
    },
    status: {
      type:    String,
      enum:    ["active", "inactive"],
      default: "active",
    },
    themeColor: {
      type:    String,
      default: "#00f2ff",
    },
    theme: {
      type:    String,
      enum:    ["cyberpunk", "minimal-dark", "corporate-light"],
      default: "cyberpunk",
    },
    welcomeMessage: {
      type:    String,
      default: "",
      trim:    true,
    },
    /* Prefixed key used to authenticate external /api/chat calls */
    apiKey: {
      type:   String,
      unique: true,
      sparse: true, // allows legacy agents that haven't got a key yet
      index:  true,
    },
    /* Incremented on every successful /api/chat request */
    messageCount: {
      type:    Number,
      default: 0,
    },
    /* Timestamp of the most recent chat message */
    lastMessageAt: {
      type:    Date,
      default: null,
    },
    /* Free-plan: daily message quota tracking */
    dailyMessageCount: {
      type:    Number,
      default: 0,
    },
    dailyResetDate: {
      type:    String,
      default: "",
    },
    limitEmailSentDate: {
      type:    String,
      default: "",
    },
    dailyLimit: {
      type:    Number,
      default: 50,
    },
    isUnlimited: {
      type:    Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Agent: Model<IAgent> =
  (mongoose.models.Agent as Model<IAgent>) ||
  mongoose.model<IAgent>("Agent", AgentSchema);

export default Agent;
