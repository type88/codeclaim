import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if developer profile exists, create if not
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: developer } = await supabase
          .from("developers")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();

        if (!developer) {
          // Create developer profile for new users
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("developers") as any).insert({
            auth_user_id: user.id,
            email: user.email!,
            display_name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              null,
            avatar_url: user.user_metadata?.avatar_url || null,
          });
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
