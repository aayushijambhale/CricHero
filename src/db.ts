/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Database Connection
 * Provides both a raw MongoDB client (for lightweight SSE/reads)
 * and a Mongoose connection (for schema-based model operations).
 */

import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.ATLAS_URI;

if (!uri) {
  throw new Error("The ATLAS_URI environment variable must be defined");
}

// ─────────────────────────────────────────────
// Raw MongoDB driver (used for SSE + quick reads)
// ─────────────────────────────────────────────

let rawClient: MongoClient;

export async function connectToDatabase() {
  if (!rawClient) {
    rawClient = new MongoClient(uri!);
    await rawClient.connect();
    console.log("[DB] Raw MongoDB client connected");
  }
  return rawClient.db("cric-hero");
}

// ─────────────────────────────────────────────
// Mongoose connection (used for models/schemas)
// ─────────────────────────────────────────────

let mongooseConnected = false;

export async function connectMongoose(): Promise<void> {
  if (mongooseConnected) return;

  try {
    await mongoose.connect(uri!, {
      dbName: "cric-hero",
      serverSelectionTimeoutMS: 5000,
    });
    mongooseConnected = true;
    console.log("[DB] Mongoose connected to MongoDB Atlas");
  } catch (err) {
    console.error("[DB] Mongoose connection failed:", err);
    throw err;
  }
}

mongoose.connection.on("disconnected", () => {
  mongooseConnected = false;
  console.warn("[DB] Mongoose disconnected — will reconnect on next call");
});
