import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

// UPLOAD_DIR is injected by next.config.js (see comment there) rather than computed here —
// process.cwd() isn't reliable if the dev server is launched with a different working directory
// than the project root, and __dirname/require.resolve get rewritten by webpack's RSC bundling
// inside app/ code.
const UPLOAD_DIR = process.env.UPLOAD_DIR as string;

export interface SavedUpload {
  url: string;
  fileName: string;
}

// Vercel's serverless functions have a read-only filesystem outside /tmp (which itself doesn't
// persist across invocations or deploys) — local disk storage only works for local dev. Uses
// Vercel Blob whenever BLOB_READ_WRITE_TOKEN is present (auto-injected once Blob storage is
// attached to the Vercel project), and falls back to local disk otherwise so `npm run dev`
// keeps working without needing Blob credentials.
export async function saveUploadedFile(file: File): Promise<SavedUpload> {
  const ext = path.extname(file.name);
  const storedName = `${randomUUID()}${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(storedName, file, { access: "public" });
    return { url: blob.url, fileName: file.name };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, storedName), buffer);

  return { url: `/uploads/${storedName}`, fileName: file.name };
}
