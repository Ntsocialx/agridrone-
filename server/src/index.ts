import "dotenv/config";
import { createApp } from "./app";
import { env } from "./config/env";
import { createPgDb } from "./db";
import { createCloudinaryStorage } from "./storage";

const { DATABASE_URL, JWT_SECRET, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = env;
if (!DATABASE_URL || !JWT_SECRET || !CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  throw new Error("DATABASE_URL, JWT_SECRET and the three CLOUDINARY_* values must be set (see .env.example).");
}

const app = createApp({
  db: createPgDb(DATABASE_URL),
  storage: createCloudinaryStorage({ cloudName: CLOUDINARY_CLOUD_NAME, apiKey: CLOUDINARY_API_KEY, apiSecret: CLOUDINARY_API_SECRET }),
  jwtSecret: JWT_SECRET,
});

app.listen(env.PORT, "0.0.0.0", () => {
  console.info(JSON.stringify({ event: "server_listening", port: env.PORT }));
});
