import { NextRequest, NextResponse } from "next/server";
import { setAdminCookie } from "@/lib/auth-admin";

export async function POST(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 4) {
    return NextResponse.json(
      { error: "Administration non configurée (ADMIN_PASSWORD manquant)." },
      { status: 500 }
    );
  }
  const body = await request.json().catch(() => ({}));
  const { password: submitted } = body;
  if (submitted !== password) {
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }
  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
