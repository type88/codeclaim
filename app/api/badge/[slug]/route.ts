import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

function getBadgeColor(percentage: number): string {
  if (percentage >= 75) return "#e74c3c"; // Red - mostly claimed
  if (percentage >= 50) return "#f39c12"; // Orange
  if (percentage >= 25) return "#3498db"; // Blue
  return "#2ecc71"; // Green - plenty left
}

function generateBadgeSvg(label: string, value: string, color: string): string {
  const labelWidth = label.length * 6.5 + 12;
  const valueWidth = value.length * 6.5 + 12;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="a" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#a)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;
}

// GET /api/badge/[slug] - Generate SVG badge
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: projectData } = await (supabase
    .from("projects") as any)
    .select(`
      name,
      code_batches (
        total_codes,
        used_codes
      )
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .is("deleted_at", null)
    .single();

  if (!projectData) {
    const svg = generateBadgeSvg("codes", "not found", "#999");
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache",
      },
    });
  }

  type BatchInfo = { total_codes: number; used_codes: number };
  const batches = (projectData.code_batches || []) as BatchInfo[];
  const totalCodes = batches.reduce((sum, b) => sum + b.total_codes, 0);
  const usedCodes = batches.reduce((sum, b) => sum + b.used_codes, 0);
  const percentage = totalCodes > 0 ? Math.round((usedCodes / totalCodes) * 100) : 0;
  const available = totalCodes - usedCodes;

  const color = getBadgeColor(percentage);
  const value = available > 0 ? `${percentage}% claimed` : "all claimed";
  const svg = generateBadgeSvg("codes", value, color);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=300", // 5-minute cache
    },
  });
}
