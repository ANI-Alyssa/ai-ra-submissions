import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, createSessionToken } from "../../../lib/auth/session";

export async function POST(request: NextRequest) {
  const { password } = (await request.json()) as { password?: string };

  if (password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
