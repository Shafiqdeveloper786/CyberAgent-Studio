/**
 * KnowledgeChunk — one 500-character text slice from an uploaded file.
 *
 * Atlas Vector Search index (create once in Atlas UI):
 *   Collection : knowledgechunks
 *   Index name : knowledge_vector_search
 *   {
 *     "fields": [
 *       { "type": "vector", "path": "embedding", "numDimensions": 384, "similarity": "cosine" },
 *       { "type": "filter", "path": "agentId" }
 *     ]
 *   }
 */

import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IKnowledgeChunk extends Document {
  knowledgeId: Types.ObjectId;
  agentId:     Types.ObjectId;
  userId:      Types.ObjectId;
  fileName:    string;
  content:     string;
  embedding:   number[];
  chunkIndex:  number;
  createdAt:   Date;
  updatedAt:   Date;
}

const KnowledgeChunkSchema = new Schema<IKnowledgeChunk>(
  {
    knowledgeId: {
      type:     Schema.Types.ObjectId,
      ref:      "Knowledge",
      required: true,
      index:    true,
    },
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
    },
    fileName: {
      type:     String,
      required: true,
      trim:     true,
    },
    content: {
      type:     String,
      required: true,
    },
    /* 384-dimension vector — MUST be [Number] not [Schema.Types.Mixed] */
    embedding: {
      type:     [Number],
      required: true,
    },
    chunkIndex: {
      type:    Number,
      default: 0,
    },
  },
  { timestamps: true }
);

/* ── Prevent HMR from re-registering on every hot-reload ── */
let KnowledgeChunk: Model<IKnowledgeChunk>;

if (mongoose.models.KnowledgeChunk) {
  console.log("[KnowledgeChunk model] Reusing existing registered model.");
  KnowledgeChunk = mongoose.models.KnowledgeChunk as Model<IKnowledgeChunk>;
} else {
  console.log("[KnowledgeChunk model] Registering new model → collection: knowledgechunks");
  /* Third argument explicitly sets the MongoDB collection name */
  KnowledgeChunk = mongoose.model<IKnowledgeChunk>(
    "KnowledgeChunk",
    KnowledgeChunkSchema,
    "knowledgechunks"
  );
}

export default KnowledgeChunk;
