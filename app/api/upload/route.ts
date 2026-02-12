import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { success: false, error: "No file provided", code: "NO_FILE" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { success: false, error: "File too large. Maximum size is 5MB.", code: "FILE_TOO_LARGE" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { success: false, error: "Invalid file type. Allowed: JPG, PNG, WebP, GIF.", code: "INVALID_TYPE" },
      { status: 400 }
    );
  }

  // Generate a unique path: {user_id}/{timestamp}-{sanitized_filename}
  const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase();
  const path = `${user.id}/${Date.now()}-${sanitized}`;

  const { error: uploadError } = await supabase.storage
    .from("project-assets")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return NextResponse.json(
      { success: false, error: "Upload failed. Please try again.", code: "UPLOAD_FAILED" },
      { status: 500 }
    );
  }

  const { data: { publicUrl } } = supabase.storage
    .from("project-assets")
    .getPublicUrl(path);

  return NextResponse.json({
    success: true,
    data: { url: publicUrl, path },
  });
}
