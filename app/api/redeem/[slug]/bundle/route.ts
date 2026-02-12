import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

function hashIP(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

// POST /api/redeem/[slug]/bundle - Redeem codes for multiple platforms
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const supabase = await createClient();

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { platforms, fingerprint } = body as {
    platforms?: string[];
    fingerprint?: string;
  };

  if (!platforms || platforms.length === 0) {
    return NextResponse.json(
      { success: false, error: "At least one platform is required", code: "NO_PLATFORMS" },
      { status: 400 }
    );
  }

  const userAgent = request.headers.get("user-agent") || "";
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const ipHash = hashIP(ip);

  const { data: { user } } = await supabase.auth.getUser();
  const authUserId = user?.id || null;
  const userEmail = user?.email || null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("redeem_bundle", {
    p_project_slug: slug,
    p_platforms: platforms,
    p_fingerprint: fingerprint || null,
    p_user_agent: userAgent,
    p_ip_hash: ipHash,
    p_auth_user_id: authUserId,
    p_redeemer_email: userEmail,
  });

  if (error) {
    console.error("Bundle redemption error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to redeem bundle", code: "BUNDLE_FAILED" },
      { status: 500 }
    );
  }

  const result = data as { success: boolean; bundle_id?: string; codes?: { platform: string; code_value: string }[]; error_message?: string };

  if (!result || !result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result?.error_message || "Bundle redemption failed",
        code: "BUNDLE_FAILED",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      bundle_id: result.bundle_id,
      codes: result.codes,
    },
  });
}
