import "dotenv/config";
import { randomUUID } from "node:crypto";
import { env } from "../config/env";
import { createCloudinaryStorage } from "../storage";

// Live round-trip against the real Cloudinary account using a 1x1 test PNG:
// private upload → public URL blocked → signed link works → delete.
const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = env;
if (!cloudName || !apiKey || !apiSecret) throw new Error("Set the three CLOUDINARY_* values in .env first.");

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function main() {
  const storage = createCloudinaryStorage({ cloudName: cloudName!, apiKey: apiKey!, apiSecret: apiSecret! });
  const publicId = `agridrone/connection-check/${randomUUID()}`;
  const step = (name: string, ok: boolean) => {
    console.info(`${ok ? "PASS" : "FAIL"}  ${name}`);
    if (!ok) process.exitCode = 1;
  };

  const { uploadUrl, fields } = storage.signUpload({ publicId, type: "authenticated", allowedFormats: ["png"] });
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, String(value));
  form.append("file", new Blob([PNG], { type: "image/png" }), "check.png");
  const upload = await fetch(uploadUrl, { method: "POST", body: form });
  step("signed private upload accepted", upload.ok);
  if (!upload.ok) {
    console.info((await upload.text()).slice(0, 200));
    return;
  }

  try {
    const file = await storage.find(publicId, "authenticated");
    step("server can look the file up", file?.format === "png");

    const publicUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}.png`;
    step("file is NOT reachable at a public URL", !(await fetch(publicUrl)).ok);

    const link = storage.privateUrl(publicId, "png", Math.floor(Date.now() / 1000) + 300);
    step("5-minute admin link downloads it", (await fetch(link)).ok);
  } finally {
    await storage.remove(publicId, "authenticated");
    step("test file deleted", (await storage.find(publicId, "authenticated")) === null);
  }
}

main();
