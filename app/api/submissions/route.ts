import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { submissionInputSchema } from "@/lib/validation";
import { createSubmission } from "@/lib/submissionService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = submissionInputSchema.parse(body);
    const submissionId = await createSubmission(data);
    return NextResponse.json({ submissionId }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
