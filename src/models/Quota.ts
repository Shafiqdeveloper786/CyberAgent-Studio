import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Daily message quota — one document per (agentId, date) pair.
 *
 * The unique compound index { agentId: 1, date: 1 } is the atomicity
 * guarantee: MongoDB enforces that only one document can exist per agent
 * per UTC day, so concurrent upserts never produce duplicate records.
 *
 * Index creation is handled explicitly by initCollections() in lib/mongodb.ts
 * rather than relying on Mongoose autoIndex, ensuring the index is present
 * before the first request is ever processed.
 */
const quotaSchema = new Schema(
  {
    agentId: {
      type:     Schema.Types.ObjectId,
      ref:      "Agent",
      required: true,
    },
    date: {
      type:     String,   // "YYYY-MM-DD" UTC — never localised
      required: true,
    },
    count: {
      type:    Number,
      default: 0,
      min:     0,
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
  { timestamps: false, versionKey: false }
);

/* Unique compound index — must exist on Atlas before any writes */
quotaSchema.index({ agentId: 1, date: 1 }, { unique: true });

type QuotaDoc = InferSchemaType<typeof quotaSchema>;

const Quota: Model<QuotaDoc> =
  (mongoose.models.Quota as Model<QuotaDoc>) ??
  mongoose.model<QuotaDoc>("Quota", quotaSchema);

export default Quota;
