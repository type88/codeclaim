import { createClient } from "@/lib/supabase/server";
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

  // Get user agent
  const userAgent = request.headers.get("user-agent") || "";

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
    return NextResponse.json(
      {
        success: false,
        error: result?.error_message || "No codes available for this platform",
        code: "NO_CODES_AVAILABLE",
        platform,
        detected_platform: detectedPlatform,
      },
      { status: 404 }
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
      },
      platforms: platformAvailability,
      detected_platform: detectedPlatform,
      has_codes_for_detected:
        detectedPlatform && platformAvailability[detectedPlatform]?.available,
    },
  });
}
