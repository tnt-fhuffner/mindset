import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAppPath } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeAppPath(searchParams.get("next"));
  const oauthError = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  if (oauthError) {
    const params = new URLSearchParams();
    params.set("error", oauthError);
    if (errorCode) params.set("error_code", errorCode);
    if (errorDescription) params.set("error", errorDescription);
    return NextResponse.redirect(`${origin}/login?${params.toString()}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}/login`);
}
