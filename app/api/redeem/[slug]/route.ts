import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { PlatformType } from "@/types/database";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// Detect platform from user agent
function detectPlatform(userAgent: string): PlatformType | null {
  const ua = userAgent.toLowerCase();

  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    return "ios";
  }
  if (ua.includes("android")) {
    return "android";
  }
  if (ua.includes("playstation")) {
    return "playstation";
  }
  if (ua.includes("xbox")) {
    return "xbox";
  }
  if (ua.includes("nintendo") || ua.includes("switch")) {
    return "nintendo";
  }
  if (ua.includes("steam")) {
    return "steam";
  }
  if (ua.includes("mac")) {
    return "macos";
  }
  if (ua.includes("windows")) {
    return "windows";
  }

  return null;
}

function hashIP(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

// POST /api/redeem/[slug] - Redeem a code for a project
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const supabase = await createClient();

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { platform: requestedPlatform, fingerprint } = body as {
    platform?: PlatformType;
    fingerprint?: string;
  };

  // Check project-level expiration before processing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: projectCheck } = await (supabase.from("projects") as any)
    .select("id, expires_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .is("deleted_at", null)
    .single();

  if (projectCheck?.expires_at && new Date(projectCheck.expires_at) < new Date()) {
    return NextResponse.json(
      { success: false, error: "This campaign has ended", code: "CAMPAIGN_EXPIRED" },
      { status: 410 }
    );
  }

  // Get user agent and IP
  const userAgent = request.headers.get("user-agent") || "";
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const ipHash = hashIP(ip);

  // Check if user is authenticated (for projects that require auth)
  const { data: { user } } = await supabase.auth.getUser();
  const authUserId = user?.id || null;
  const userEmail = user?.email || null;

  // Detect platform if not provided
  const detectedPlatform = detectPlatform(userAgent);
  const platform = requestedPlatform || detectedPlatform;

  if (!platform) {
    return NextResponse.json(
      {
        success: false,
        error: "Could not detect platform. Please specify a platform.",
        code: "PLATFORM_REQUIRED",
        detected_platform: null,
      },
      { status: 400 }
    );
  }

  // Validate platform
  const validPlatforms: PlatformType[] = ["ios", "android", "steam", "web", "windows", "macos", "playstation", "xbox", "nintendo"];
  if (!validPlatforms.includes(platform)) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid platform. Must be one of: ${validPlatforms.join(", ")}`,
        code: "INVALID_PLATFORM",
      },
      { status: 400 }
    );
  }

  // Call the database function to allocate a code
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("public_redeem_code", {
    p_project_slug: slug,
    p_platform: platform,
    p_fingerprint: fingerprint || null,
    p_user_agent: userAgent,
    p_ip_hash: ipHash,
    p_auth_user_id: authUserId,
    p_redeemer_email: userEmail,
  });

  if (error) {
    console.error("Redemption error:", error);
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === "development"
          ? `Redemption failed: ${error.message}`
          : "Failed to redeem code. Please try again.",
        code: "REDEMPTION_FAILED",
      },
      { status: 500 }
    );
  }

  type RedeemResult = { success: boolean; code_value: string | null; error_message: string | null };
  const result = (data as RedeemResult[] | null)?.[0];

  if (!result || !result.success) {
    const errorMessage = result?.error_message || "No codes available for this platform";
    const isRateLimit = errorMessage.includes("Rate limit") || errorMessage.includes("Too many requests");
    const isAuthRequired = errorMessage.includes("Authentication required");

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: isRateLimit ? "RATE_LIMITED" : isAuthRequired ? "AUTH_REQUIRED" : "NO_CODES_AVAILABLE",
        platform,
        detected_platform: detectedPlatform,
      },
      { status: isRateLimit ? 429 : isAuthRequired ? 401 : 404 }
    );
  }

  // Fetch the store IDs from the batch (via the redeemed code)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: codeData } = await (supabase
    .from("codes") as any)
    .select(`
      batch_id,
      code_batches (
        app_store_id,
        play_store_package,
        steam_app_id
      )
    `)
    .eq("code_value", result.code_value)
    .single();

  const batch = codeData?.code_batches as { app_store_id?: string; play_store_package?: string; steam_app_id?: string } | null;

  // Fire webhook asynchronously (don't block the response)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      fetch(`${supabaseUrl}/functions/v1/send-webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          project_id: projectCheck?.id,
          event_type: "code_redeemed",
          payload: { platform, slug },
        }),
      }).catch(() => {});
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      code: result.code_value,
      platform,
      detected_platform: detectedPlatform,
      app_store_id: batch?.app_store_id || null,
      play_store_package: batch?.play_store_package || null,
      steam_app_id: batch?.steam_app_id || null,
    },
  });
}

// GET /api/redeem/[slug] - Get project info and available platforms
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const supabase = await createClient();

  // Get project and batch availability
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: projectData, error } = await (supabase
    .from("projects") as any)
    .select(`
      id,
      name,
      slug,
      description,
      icon_url,
      require_auth,
      hero_image_url,
      promo_headline,
      promo_description,
      cta_text,
      show_social_proof,
      social_proof_style,
      developer_logo_url,
      theme_color,
      expires_at,
      enable_bundles,
      retain_redeemer_email,
      code_batches (
        platform,
        total_codes,
        used_codes,
        expires_at,
        app_store_id,
        play_store_package,
        steam_app_id
      )
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .is("deleted_at", null)
    .single();

  if (error || !projectData) {
    return NextResponse.json(
      { success: false, error: "Project not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  type BatchInfo = {
    platform: string;
    total_codes: number;
    used_codes: number;
    expires_at: string | null;
    app_store_id: string | null;
    play_store_package: string | null;
    steam_app_id: string | null;
  };

  const project = projectData as {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon_url: string | null;
    require_auth: boolean;
    hero_image_url: string | null;
    promo_headline: string | null;
    promo_description: string | null;
    cta_text: string | null;
    show_social_proof: boolean;
    social_proof_style: string;
    developer_logo_url: string | null;
    theme_color: string | null;
    expires_at: string | null;
    enable_bundles: boolean;
    retain_redeemer_email: boolean;
    code_batches: BatchInfo[] | null;
  };

  // Calculate available codes per platform
  const platformAvailability: Record<string, {
    available: boolean;
    count: number;
    app_store_id?: string | null;
    play_store_package?: string | null;
    steam_app_id?: string | null;
  }> = {};
  const batches = project.code_batches || [];

  batches.forEach((batch) => {
    const isExpired = batch.expires_at && new Date(batch.expires_at) < new Date();
    const available = !isExpired && batch.total_codes > batch.used_codes;
    const availableCount = batch.total_codes - batch.used_codes;

    if (!platformAvailability[batch.platform]) {
      platformAvailability[batch.platform] = { available: false, count: 0 };
    }

    if (available) {
      platformAvailability[batch.platform].available = true;
      platformAvailability[batch.platform].count += availableCount;
      // Store the store IDs (use the first non-null value found)
      if (batch.app_store_id && !platformAvailability[batch.platform].app_store_id) {
        platformAvailability[batch.platform].app_store_id = batch.app_store_id;
      }
      if (batch.play_store_package && !platformAvailability[batch.platform].play_store_package) {
        platformAvailability[batch.platform].play_store_package = batch.play_store_package;
      }
      if (batch.steam_app_id && !platformAvailability[batch.platform].steam_app_id) {
        platformAvailability[batch.platform].steam_app_id = batch.steam_app_id;
      }
    }
  });

  // Check project-level expiration
  if (project.expires_at && new Date(project.expires_at) < new Date()) {
    return NextResponse.json({
      success: true,
      data: {
        project: {
          name: project.name,
          slug: project.slug,
          description: project.description,
          icon_url: project.icon_url,
          hero_image_url: project.hero_image_url,
          promo_headline: project.promo_headline,
          promo_description: project.promo_description,
          developer_logo_url: project.developer_logo_url,
          theme_color: project.theme_color,
        },
        expired: true,
        expires_at: project.expires_at,
        require_auth: project.require_auth,
        platforms: {},
        detected_platform: null,
        has_codes_for_detected: false,
      },
    });
  }

  // Calculate social proof stats
  const totalCodes = batches.reduce((sum, b) => sum + b.total_codes, 0);
  const usedCodes = batches.reduce((sum, b) => sum + b.used_codes, 0);
  const availableCodes = totalCodes - usedCodes;

  // Detect user's platform
  const userAgent = request.headers.get("user-agent") || "";
  const detectedPlatform = detectPlatform(userAgent);

  return NextResponse.json({
    success: true,
    data: {
      project: {
        name: project.name,
        slug: project.slug,
        description: project.description,
        icon_url: project.icon_url,
        hero_image_url: project.hero_image_url,
        promo_headline: project.promo_headline,
        promo_description: project.promo_description,
        cta_text: project.cta_text,
        show_social_proof: project.show_social_proof,
        social_proof_style: project.social_proof_style,
        developer_logo_url: project.developer_logo_url,
        theme_color: project.theme_color,
      },
      social_proof: {
        total_codes: totalCodes,
        used_codes: usedCodes,
        available_codes: availableCodes,
      },
      expired: false,
      expires_at: project.expires_at,
      require_auth: project.require_auth,
      platforms: platformAvailability,
      detected_platform: detectedPlatform,
      has_codes_for_detected:
        detectedPlatform && platformAvailability[detectedPlatform]?.available,
      enable_bundles: project.enable_bundles ?? false,
      retain_redeemer_email: project.retain_redeemer_email ?? false,
    },
  });
}
