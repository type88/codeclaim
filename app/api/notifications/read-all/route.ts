import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/notifications/read-all - Mark all notifications as read
export async function POST() {
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
      { success: false, error: "Developer not found", code: "NO_PROFILE" },
      { status: 404 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase
    .from("notification_logs") as any)
    .update({ is_read: true })
    .eq("developer_id", developer.id)
    .eq("is_read", false);

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to mark all as read", code: "UPDATE_FAILED" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
