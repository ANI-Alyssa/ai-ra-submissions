export interface UploadResult {
  url: string;
  fileName: string;
}

// Client-side helper for the <input type="file"> fields in the submit/revise forms — uploads to
// /api/uploads and returns null when no file was selected so callers can just spread the result.
export async function uploadFileIfPresent(value: FormDataEntryValue | null): Promise<UploadResult | null> {
  if (!(value instanceof File) || value.size === 0) return null;

  const body = new FormData();
  body.set("file", value);

  const res = await fetch("/api/uploads", { method: "POST", body });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "File upload failed");
  }

  return data as UploadResult;
}
