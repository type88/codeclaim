import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string; batchId: string }>;
}

// DELETE /api/projects/[id]/batches/[batchId] - Soft delete a batch and its codes
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: projectId, batchId } = await params;
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

  // Verify batch belongs to this project (RLS enforces ownership)
  const { data: batch } = await supabase
    .from("code_batches")
    .select("id")
    .eq("id", batchId)
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .single();

  if (!batch) {
    return NextResponse.json(
      { success: false, error: "Batch not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // Soft delete the batch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: batchError } = await (supabase
    .from("code_batches") as any)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", batchId);

  if (batchError) {
    return NextResponse.json(
      { success: false, error: "Failed to delete batch", code: "DELETE_FAILED" },
      { status: 500 }
    );
  }

  // Soft delete child codes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: codesError } = await (supabase.from("codes") as any)
    .update({ deleted_at: new Date().toISOString() })
    .eq("batch_id", batchId);

  if (codesError) {
    return NextResponse.json(
      { success: false, error: "Batch deleted but codes may still be active", code: "PARTIAL_DELETE" },
      { status: 207 }
    );
  }

  return NextResponse.json({ success: true, data: { deleted: true } });
}
