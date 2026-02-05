import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { PlatformType } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/batches - List all batches for a project
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params;
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

  const { data: batches, error } = await supabase
    .from("code_batches")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message, code: "DB_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: batches });
}

// POST /api/projects/[id]/batches - Create a new batch with codes
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params;
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

  const { name, platform, codes, description, expires_at, app_store_id, play_store_package, steam_app_id } = body as {
    name: string;
    platform: PlatformType;
    codes: string[];
    description?: string;
    expires_at?: string;
    app_store_id?: string;
    play_store_package?: string;
    steam_app_id?: string;
  };

  // Validate required fields
  if (!name || !platform || !codes || !Array.isArray(codes)) {
    return NextResponse.json(
      { success: false, error: "Name, platform, and codes array are required", code: "MISSING_FIELDS" },
      { status: 400 }
    );
  }

  if (codes.length === 0) {
    return NextResponse.json(
      { success: false, error: "At least one code is required", code: "EMPTY_CODES" },
      { status: 400 }
    );
  }

  // Validate platform
  const validPlatforms: PlatformType[] = ["ios", "android", "steam", "web", "windows", "macos", "playstation", "xbox", "nintendo"];
  if (!validPlatforms.includes(platform)) {
    return NextResponse.json(
      { success: false, error: `Invalid platform. Must be one of: ${validPlatforms.join(", ")}`, code: "INVALID_PLATFORM" },
      { status: 400 }
    );
  }

  // Verify project exists and belongs to user (RLS handles this, but we want a nice error message)
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .is("deleted_at", null)
    .single();

  if (!project) {
    return NextResponse.json(
      { success: false, error: "Project not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // Create batch
  const batchData = {
    project_id: projectId,
    name,
    platform,
    description: description || null,
    expires_at: expires_at || null,
    app_store_id: app_store_id || null,
    play_store_package: play_store_package || null,
    steam_app_id: steam_app_id || null,
    status: "processing" as const,
    total_codes: codes.length,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: batch, error: batchError } = await (supabase
    .from("code_batches") as any)
    .insert(batchData)
    .select()
    .single();

  if (batchError || !batch) {
    return NextResponse.json(
      { success: false, error: batchError?.message || "Failed to create batch", code: "CREATE_FAILED" },
      { status: 500 }
    );
  }

  // Insert codes
  const codeRecords = codes.map((codeValue: string) => ({
    batch_id: batch.id,
    code_value: codeValue.trim(),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: codesError } = await (supabase.from("codes") as any).insert(codeRecords);

  if (codesError) {
    // Rollback batch creation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("code_batches") as any).delete().eq("id", batch.id);

    // Check for duplicate codes
    if (codesError.code === "23505") {
      return NextResponse.json(
        { success: false, error: "Duplicate codes detected in batch", code: "DUPLICATE_CODES" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: codesError.message, code: "CODES_INSERT_FAILED" },
      { status: 500 }
    );
  }

  // Mark batch as completed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updatedBatch } = await (supabase
    .from("code_batches") as any)
    .update({ status: "completed" })
    .eq("id", batch.id)
    .select()
    .single();

  return NextResponse.json(
    { success: true, data: updatedBatch },
    { status: 201 }
  );
}
