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

  // Verify project ownership (RLS handles this but we want a nice error)
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

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all redemption logs from last 30 days
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: logs } = await (supabase
    .from("redemption_logs") as any)
    .select("created_at, requested_platform, success, failure_reason")
    .eq("project_id", projectId)
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false });

  type LogRow = {
    created_at: string;
    requested_platform: string;
    success: boolean;
    failure_reason: string | null;
  };

  const allLogs = (logs || []) as LogRow[];

  // Aggregate daily counts
  const dailyMap: Record<string, number> = {};
  for (const log of allLogs) {
    const day = log.created_at.slice(0, 10); // YYYY-MM-DD
    dailyMap[day] = (dailyMap[day] || 0) + 1;
  }

  // Fill in missing days with 0
  const dailyCounts: { day: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dailyCounts.push({ day: key, count: dailyMap[key] || 0 });
  }

  // Aggregate platform stats
  const platformStats: Record<string, { total: number; success: number; failed: number }> = {};
  let totalSuccess = 0;

  for (const log of allLogs) {
    const p = log.requested_platform || "unknown";
    if (!platformStats[p]) platformStats[p] = { total: 0, success: 0, failed: 0 };
    platformStats[p].total++;
    if (log.success) {
      platformStats[p].success++;
      totalSuccess++;
    } else {
      platformStats[p].failed++;
    }
  }

  const successRate = allLogs.length > 0 ? Math.round((totalSuccess / allLogs.length) * 100) : 0;

  // Recent 20
  const recentActivity = allLogs.slice(0, 20);

  return NextResponse.json({
    success: true,
    data: {
      daily_counts: dailyCounts,
      platform_stats: platformStats,
      success_rate: successRate,
      total_redemptions: allLogs.length,
      total_success: totalSuccess,
      recent_activity: recentActivity,
    },
  });
}
