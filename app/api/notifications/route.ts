import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/notifications - List notifications for the authenticated developer
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("notification_logs") as any)
    .select(`
      id,
      project_id,
      event_type,
      title,
      message,
      event_data,
      is_read,
      created_at,
      projects ( name, slug )
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to load notifications", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  const notifications = data || [];
  const unreadCount = notifications.filter(
    (n: { is_read: boolean }) => !n.is_read
  ).length;

  return NextResponse.json({
    success: true,
    data: { notifications, unread_count: unreadCount },
  });
}
