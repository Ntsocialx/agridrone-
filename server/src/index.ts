import "dotenv/config";
import { createApp } from "./app";
import { env } from "./config/env";
import { createPgDb } from "./db";

if (!env.DATABASE_URL || !env.JWT_SECRET) {
  throw new Error("DATABASE_URL and JWT_SECRET must be set (see .env.example).");
}

const app = createApp({ db: createPgDb(env.DATABASE_URL), jwtSecret: env.JWT_SECRET });

app.listen(env.PORT, "0.0.0.0", () => {
  console.info(JSON.stringify({ event: "server_listening", port: env.PORT }));
});
