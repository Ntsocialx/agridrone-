import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Port 5173 is fixed so it matches the API's CORS allow-list for local testing.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
});
