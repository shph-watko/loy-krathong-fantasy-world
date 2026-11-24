import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");
  const safeNext =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? new URL(requestedNext, requestUrl.origin)
      : new URL("/", requestUrl.origin);

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(new URL("/?auth=error", requestUrl.origin));
      }
      safeNext.searchParams.set("auth", "success");
      return NextResponse.redirect(safeNext);
    }
  }

  return NextResponse.redirect(new URL("/?auth=not-configured", requestUrl.origin));
}
