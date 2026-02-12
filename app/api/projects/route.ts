import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { campaignTemplates } from "@/lib/templates/campaign-templates";

// GET /api/projects - List all projects for the authenticated developer
export async function GET() {
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

  // Get developer ID
  const { data: developerData } = await supabase
    .from("developers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  const developer = developerData as { id: string } | null;

  if (!developer) {
    return NextResponse.json(
      { success: false, error: "Developer profile not found", code: "NO_PROFILE" },
      { status: 404 }
    );
  }

  // Get projects with batch statistics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: projectsData, error } = await (supabase
    .from("projects") as any)
    .select(`
      *,
      code_batches (
        id,
        platform,
        total_codes,
        used_codes
      )
    `)
    .eq("developer_id", developer.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message, code: "DB_ERROR" },
      { status: 500 }
    );
  }

  type BatchData = { id: string; platform: string; total_codes: number; used_codes: number };
  type ProjectData = Record<string, unknown> & { code_batches: BatchData[] | null };

  const projects = (projectsData || []) as ProjectData[];

  // Calculate aggregate stats for each project
  const projectsWithStats = projects.map((project) => {
    const batches = project.code_batches || [];
    const totalCodes = batches.reduce((sum, b) => sum + b.total_codes, 0);
    const usedCodes = batches.reduce((sum, b) => sum + b.used_codes, 0);

    return {
      ...project,
      code_batches: undefined, // Remove raw batch data
      stats: {
        total_batches: batches.length,
        total_codes: totalCodes,
        used_codes: usedCodes,
        available_codes: totalCodes - usedCodes,
        redemption_rate: totalCodes > 0 ? Math.round((usedCodes / totalCodes) * 100) : 0,
      },
    };
  });

  return NextResponse.json({ success: true, data: projectsWithStats });
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
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

  // Get developer ID
  const { data: devData } = await supabase
    .from("developers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  const developer = devData as { id: string } | null;

  if (!developer) {
    return NextResponse.json(
      { success: false, error: "Developer profile not found", code: "NO_PROFILE" },
      { status: 404 }
    );
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const { name, slug, description, website_url, template } = body;

  // Validate required fields
  if (!name || !slug) {
    return NextResponse.json(
      { success: false, error: "Name and slug are required", code: "MISSING_FIELDS" },
      { status: 400 }
    );
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { success: false, error: "Slug must contain only lowercase letters, numbers, and hyphens", code: "INVALID_SLUG" },
      { status: 400 }
    );
  }

  // Build insert data, applying template fields if selected
  const insertData: Record<string, unknown> = {
    developer_id: developer.id,
    name,
    slug,
    description: description || null,
    website_url: website_url || null,
  };

  if (template && campaignTemplates[template]) {
    const t = campaignTemplates[template];
    insertData.promo_headline = t.promo_headline;
    insertData.promo_description = t.promo_description;
    insertData.cta_text = t.cta_text;
    insertData.require_auth = t.require_auth;
    insertData.show_social_proof = t.show_social_proof;
    insertData.social_proof_style = t.social_proof_style;
  }

  // Create project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error } = await (supabase
    .from("projects") as any)
    .insert(insertData)
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "A project with this slug already exists", code: "DUPLICATE_SLUG" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message, code: "DB_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: project }, { status: 201 });
}
