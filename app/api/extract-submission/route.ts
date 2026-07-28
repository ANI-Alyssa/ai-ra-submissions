import { NextRequest, NextResponse } from "next/server";
import { extractSubmissionFields } from "@/lib/ai/extractSubmission";

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json();
    if (typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }

    const fields = await extractSubmissionFields(description);
    return NextResponse.json(fields);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
