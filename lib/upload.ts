import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

// UPLOAD_DIR is injected by next.config.js (see comment there) rather than computed here —
// process.cwd() isn't reliable if the dev server is launched with a different working directory
// than the project root, and __dirname/require.resolve get rewritten by webpack's RSC bundling
// inside app/ code.
const UPLOAD_DIR = process.env.UPLOAD_DIR as string;

export interface SavedUpload {
  url: string;
  fileName: string;
}

// Local disk storage for the MVP — good enough for internal testing on one machine. Once this
// app is actually deployed, swap this for real object storage (S3/Supabase/etc.) so uploads
// survive redeploys and are reachable from outside localhost; nothing else in the upload flow
// needs to change, just this function's implementation.
export async function saveUploadedFile(file: File): Promise<SavedUpload> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = path.extname(file.name);
  const storedName = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(path.join(UPLOAD_DIR, storedName), buffer);

  return { url: `/uploads/${storedName}`, fileName: file.name };
}
