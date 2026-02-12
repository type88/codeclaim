import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/redeemers - List redeemer emails
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

  // Get redeemed codes with emails for this project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("codes") as any)
    .select(`
      redeemer_email,
      used_at,
      code_batches!inner (
        project_id,
        platform
      )
    `)
    .eq("code_batches.project_id", projectId)
    .eq("is_used", true)
    .not("redeemer_email", "is", null)
    .order("used_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to load redeemers", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  type RedeemRow = {
    redeemer_email: string;
    used_at: string;
    code_batches: { project_id: string; platform: string };
  };

  const redeemers = ((data || []) as RedeemRow[]).map((row) => ({
    email: row.redeemer_email,
    platform: row.code_batches?.platform || "unknown",
    redeemed_at: row.used_at,
  }));

  return NextResponse.json({ success: true, data: redeemers });
}
