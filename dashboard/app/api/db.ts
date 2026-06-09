/**
 * Shared database helper for dashboard API routes.
 * Returns a MongoDB collection if DB_BACKEND=mongodb, or null for SQLite.
 */

import { Collection, MongoClient } from "mongodb";

let _client: MongoClient | null = null;
let _db: any = null;

async function getMongoDb(): Promise<any> {
  if (_db) return _db;
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
  const dbName = process.env.MONGODB_DATABASE || "agriforge_voice";
  _client = new MongoClient(uri);
  await _client.connect();
  _db = _client.db(dbName);
  return _db;
}

export async function getCollection(name: string): Promise<Collection | null> {
  const backend = (process.env.DB_BACKEND || "sqlite").toLowerCase();
  if (backend !== "mongodb") return null;
  const db = await getMongoDb();
  return db.collection(name);
}

/** Convert MongoDB _id to string id for SQLite-compatible output */
export function normalizeDoc(doc: any): any {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return { id: _id?.toString(), ...rest };
}
