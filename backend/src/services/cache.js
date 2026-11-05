import { createClient } from "redis";

let client;
export const cache = async () => {
  if (!process.env.REDIS_URL) return null;
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on("error", () => {});
    await client.connect();
  }
  return client;
};
