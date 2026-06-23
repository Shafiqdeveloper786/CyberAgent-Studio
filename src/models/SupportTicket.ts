import mongoose, { Document, Model, Schema, Types } from "mongoose";

/* ── Nested types ── */
export interface IChatMessage {
  role:      "user" | "assistant";
  content:   string;
  timestamp: Date;
}

export interface IReply {
  sender:    "admin" | "user" | "visitor";
  message:   string;
  timestamp: Date;
}

/* ── Main document interface ── */
export interface ISupportTicket extends Document {
  /** 'internal' = from main CyberAgent dashboard → Admin Inbox
   *  'external' = from embedded widget → Tenant Dashboard              */
  type:         "internal" | "external";

  /** For external tickets: the User who owns the embedded agent.
   *  Null for internal tickets.                                        */
  tenantId?:    Types.ObjectId;

  /** Authenticated CyberAgent user who submitted (internal tickets).  */
  userId?:      Types.ObjectId;

  /** Visitor / end-user contact email (used for email gateway).       */
  contactEmail: string;

  /** Visitor / end-user display name.                                 */
  contactName:  string;

  /** Short subject line for the ticket.                               */
  subject:      string;

  /** Full conversation transcript from the NexCore AI chat widget.    */
  chatContext:  IChatMessage[];

  /** Current ticket lifecycle status.                                 */
  status:       "pending" | "in-progress" | "resolved";

  /** Is this ticket generated internally from the dashboard preview?  */
  isInternal?:  boolean;

  /** Threaded replies between admin / tenant user / visitor.          */
  replies:      IReply[];

  createdAt:    Date;
  updatedAt:    Date;
}

/* ── Schema ── */
const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role:      { type: String, enum: ["user", "assistant"], required: true },
    content:   { type: String, required: true },
    timestamp: { type: Date,   default: Date.now },
  },
  { _id: false }
);

const ReplySchema = new Schema<IReply>(
  {
    sender:    { type: String, enum: ["admin", "user", "visitor"], required: true },
    message:   { type: String, required: true },
    timestamp: { type: Date,   default: Date.now },
  },
  { _id: false }
);

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    type: {
      type:     String,
      enum:     ["internal", "external"],
      required: true,
      index:    true,
    },
    tenantId: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      default:  null,
      index:    true,
    },
    userId: {
      type:    Schema.Types.ObjectId,
      ref:     "User",
      default: null,
    },
    contactEmail: {
      type:     String,
      required: true,
      trim:     true,
      lowercase: true,
    },
    contactName: {
      type:    String,
      required: true,
      trim:    true,
    },
    subject: {
      type:     String,
      required: true,
      trim:     true,
    },
    chatContext: {
      type:    [ChatMessageSchema],
      default: [],
    },
    status: {
      type:    String,
      enum:    ["pending", "in-progress", "resolved"],
      default: "pending",
      index:   true,
    },
    isInternal: {
      type:    Boolean,
      default: false,
      index:   true,
    },
    replies: {
      type:    [ReplySchema],
      default: [],
    },
    createdAt: {
      type:     Date,
      required: true,
      default:  Date.now,
    },
    updatedAt: {
      type:     Date,
      required: true,
      default:  Date.now,
    },
  },
  { timestamps: true }
);

/* Compound indexes for efficient tenant-scoped queries */
SupportTicketSchema.index({ tenantId: 1, status: 1 });
SupportTicketSchema.index({ type: 1,     status: 1 });

const SupportTicket: Model<ISupportTicket> =
  (mongoose.models.SupportTicket as Model<ISupportTicket>) ||
  mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);

export default SupportTicket;
