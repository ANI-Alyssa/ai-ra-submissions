import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { reviseInputSchema } from "@/lib/validation";
import { reviseSubmission } from "@/lib/submissionService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const data = reviseInputSchema.parse(body);
    const submissionId = await reviseSubmission(params.id, data);
    return NextResponse.json({ submissionId });
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
