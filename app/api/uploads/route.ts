import { NextRequest, NextResponse } from "next/server";
import { saveUploadedFile } from "@/lib/upload";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File exceeds 25MB limit" }, { status: 413 });
  }

  const saved = await saveUploadedFile(file);
  return NextResponse.json(saved, { status: 201 });
}
