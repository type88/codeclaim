import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/analytics - Get redemption analytics
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_project_analytics", {
    p_project_id: projectId,
  });

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to load analytics", code: "ANALYTICS_ERROR" },
      { status: 500 }
    );
  }

  if (data?.error === "not_found") {
    return NextResponse.json(
      { success: false, error: "Project not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data });
}
