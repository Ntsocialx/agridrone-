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

  // Spreadsheets (flight logs) are stored as 'raw' files and get their extension added to the id.
  const csvId = `agridrone/connection-check/${randomUUID()}`;
  const signed = storage.signUpload({ publicId: csvId, type: "authenticated", allowedFormats: ["csv"] });
  const csvForm = new FormData();
  for (const [key, value] of Object.entries(signed.fields)) csvForm.append(key, String(value));
  csvForm.append("file", new Blob(["date,hours\n2026-11-01,1.5\n"], { type: "text/csv" }), "check.csv");
  const csvUpload = await fetch(signed.uploadUrl, { method: "POST", body: csvForm });
  step("signed private spreadsheet upload accepted", csvUpload.ok);
  if (!csvUpload.ok) {
    console.info((await csvUpload.text()).slice(0, 200));
    return;
  }
  const storedId = String(((await csvUpload.json()) as { public_id: string }).public_id);
  step("Cloudinary added the extension to the id", storedId === `${csvId}.csv`);
  try {
    const file = await storage.find(storedId, "authenticated");
    step("server can look the spreadsheet up as csv", file?.format === "csv");
    step("spreadsheet is NOT reachable at a public URL", !(await fetch(`https://res.cloudinary.com/${cloudName}/raw/upload/${storedId}`)).ok);
    const link = storage.privateUrl(storedId, "csv", Math.floor(Date.now() / 1000) + 300);
    const download = await fetch(link);
    step("5-minute admin link downloads the spreadsheet", download.ok && (await download.text()).startsWith("date,hours"));
  } finally {
    await storage.remove(storedId, "authenticated");
    step("test spreadsheet deleted", (await storage.find(storedId, "authenticated")) === null);
  }
}

main();
