import { MongoClient, type Db } from "mongodb";

let client: MongoClient | undefined;
let connecting: Promise<MongoClient> | undefined;

export async function getMongoClient(): Promise<MongoClient> {
  if (client) {
    return client;
  }
  if (!connecting) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not set");
    }
    const candidate = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
    connecting = candidate
      .connect()
      .then(() => {
        client = candidate;
        return candidate;
      })
      .catch((error: unknown) => {
        connecting = undefined;
        throw error;
      });
  }
  return connecting;
}

export async function getDb(): Promise<Db> {
  return (await getMongoClient()).db();
}
