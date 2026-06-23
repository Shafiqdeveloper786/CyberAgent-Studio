import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ITransaction extends Document {
  userId:        Types.ObjectId;
  transactionId: string;
  amount:        number;
  currency:      string;
  status:        "pending" | "succeeded" | "rejected" | "refunded";
  plan:          string;
  notes?:        string;
  createdAt:     Date;
}

const TransactionSchema = new Schema<ITransaction>({
  userId: {
    type:     Schema.Types.ObjectId,
    ref:      "User",
    required: true,
    index:    true,
  },
  transactionId: {
    type:     String,
    required: true,
    unique:   true,
    index:    true,
  },
  amount: {
    type:     Number,
    required: true,
  },
  currency: {
    type:     String,
    default:  "usd",
  },
  status: {
    type:     String,
    enum:     ["pending", "succeeded", "rejected", "refunded"],
    required: true,
  },
  plan: {
    type:     String,
    required: true,
  },
  notes: {
    type:     String,
  },
  createdAt: {
    type:     Date,
    default:  Date.now,
  },
});

const Transaction: Model<ITransaction> =
  (mongoose.models.Transaction as Model<ITransaction>) ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);

export default Transaction;
