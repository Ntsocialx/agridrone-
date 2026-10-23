import "dotenv/config";
import app from "./app";
import { env } from "./config/env";

app.listen(env.PORT, "0.0.0.0", () => {
  console.info(JSON.stringify({ event: "server_listening", port: env.PORT }));
});
