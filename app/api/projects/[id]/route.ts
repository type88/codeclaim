import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id] - Get a single project with stats
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // Get project with batches
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: projectData, error } = await (supabase
    .from("projects") as any)
    .select(`
      *,
      code_batches (
        id,
        name,
        platform,
        status,
        total_codes,
        used_codes,
        expires_at,
        created_at
      )
    `)
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !projectData) {
    return NextResponse.json(
      { success: false, error: "Project not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  type BatchData = {
    id: string;
    name: string;
    platform: string;
    status: string;
    total_codes: number;
    used_codes: number;
    expires_at: string | null;
    created_at: string;
  };

  const project = projectData as Record<string, unknown> & { code_batches: BatchData[] | null };

  // Fetch developer-reserved codes for all batches
  const batchIds = (project.code_batches || []).map((b: BatchData) => b.id);
  let reservedCodeMap: Record<string, string> = {};
  if (batchIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reservedCodes } = await (supabase
      .from("codes") as any)
      .select("batch_id, code_value")
      .in("batch_id", batchIds)
      .eq("is_developer_reserved", true);

    if (reservedCodes) {
      reservedCodeMap = (reservedCodes as { batch_id: string; code_value: string }[]).reduce(
        (acc, c) => ({ ...acc, [c.batch_id]: c.code_value }),
        {} as Record<string, string>
      );
    }
  }

  // Calculate stats
  const batches = project.code_batches || [];
  const totalCodes = batches.reduce((sum, b) => sum + b.total_codes, 0);
  const usedCodes = batches.reduce((sum, b) => sum + b.used_codes, 0);

  // Group codes by platform
  const codesByPlatform: Record<string, { total: number; used: number }> = {};
  batches.forEach((batch) => {
    if (!codesByPlatform[batch.platform]) {
      codesByPlatform[batch.platform] = { total: 0, used: 0 };
    }
    codesByPlatform[batch.platform].total += batch.total_codes;
    codesByPlatform[batch.platform].used += batch.used_codes;
  });

  // Enrich batches with reserved code info
  const enrichedBatches = batches.map((b) => ({
    ...b,
    developer_reserved_code: reservedCodeMap[b.id] || null,
  }));

  return NextResponse.json({
    success: true,
    data: {
      ...project,
      code_batches: enrichedBatches,
      stats: {
        total_batches: batches.length,
        total_codes: totalCodes,
        used_codes: usedCodes,
        available_codes: totalCodes - usedCodes,
        redemption_rate: totalCodes > 0 ? Math.round((usedCodes / totalCodes) * 100) : 0,
        codes_by_platform: codesByPlatform,
      },
    },
  });
}

// PATCH /api/projects/[id] - Update a project
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const {
    name, description, website_url, is_active, require_auth, low_code_threshold,
    // Promotional fields
    hero_image_url, promo_headline, promo_description, cta_text,
    show_social_proof, social_proof_style, developer_logo_url, theme_color,
    // Expiring links
    expires_at,
    // Notification settings
    email_notifications_enabled, notify_on_batch_low, notify_on_batch_empty, notify_on_milestones,
    // Bundles
    enable_bundles,
  } = body;

  // Build update object (only include provided fields)
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (website_url !== undefined) updates.website_url = website_url;
  if (is_active !== undefined) updates.is_active = is_active;
  if (require_auth !== undefined) updates.require_auth = require_auth;
  if (low_code_threshold !== undefined) updates.low_code_threshold = low_code_threshold;
  // Promotional fields
  if (hero_image_url !== undefined) updates.hero_image_url = hero_image_url;
  if (promo_headline !== undefined) updates.promo_headline = promo_headline;
  if (promo_description !== undefined) updates.promo_description = promo_description;
  if (cta_text !== undefined) updates.cta_text = cta_text;
  if (show_social_proof !== undefined) updates.show_social_proof = show_social_proof;
  if (social_proof_style !== undefined) updates.social_proof_style = social_proof_style;
  if (developer_logo_url !== undefined) updates.developer_logo_url = developer_logo_url;
  if (theme_color !== undefined) updates.theme_color = theme_color;
  // Expiring links
  if (expires_at !== undefined) updates.expires_at = expires_at;
  // Notification settings
  if (email_notifications_enabled !== undefined) updates.email_notifications_enabled = email_notifications_enabled;
  if (notify_on_batch_low !== undefined) updates.notify_on_batch_low = notify_on_batch_low;
  if (notify_on_batch_empty !== undefined) updates.notify_on_batch_empty = notify_on_batch_empty;
  if (notify_on_milestones !== undefined) updates.notify_on_milestones = notify_on_milestones;
  // Bundles
  if (enable_bundles !== undefined) updates.enable_bundles = enable_bundles;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { success: false, error: "No fields to update", code: "NO_UPDATES" },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updatedProject, error } = await (supabase
    .from("projects") as any)
    .update(updates)
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error || !updatedProject) {
    return NextResponse.json(
      { success: false, error: "Project not found or update failed", code: "UPDATE_FAILED" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: updatedProject });
}

// DELETE /api/projects/[id] - Soft delete a project
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase
    .from("projects") as any)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete project", code: "DELETE_FAILED" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: { deleted: true } });
}
