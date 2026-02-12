"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const platformLabels: Record<string, string> = {
  ios: "iOS",
  android: "Android",
  steam: "Steam",
  web: "Web",
  windows: "Windows",
  macos: "macOS",
  playstation: "PlayStation",
  xbox: "Xbox",
  nintendo: "Nintendo",
};

interface StatsData {
  project: {
    name: string;
    slug: string;
    description: string | null;
    icon_url: string | null;
    theme_color: string | null;
  };
  platforms: Record<string, { available: boolean; count: number }>;
  social_proof: { total_codes: number; used_codes: number; available_codes: number };
  expired: boolean;
}

export default function PublicStatsPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string>("");
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  const fetchData = useCallback(async () => {
    if (!slug) return;
    try {
      const response = await fetch(`/api/redeem/${slug}`);
      const json = await response.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "Not found");
      }
    } catch {
      setError("Failed to load");
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Not Found</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const { total_codes, used_codes, available_codes } = data.social_proof;
  const rate = total_codes > 0 ? Math.round((used_codes / total_codes) * 100) : 0;
  const accent = data.project.theme_color || "#6366f1";

  const platformEntries = Object.entries(data.platforms);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          {data.project.icon_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={data.project.icon_url}
              alt=""
              className="w-16 h-16 rounded-xl mx-auto mb-4"
            />
          )}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {data.project.name}
          </h1>
          {data.project.description && (
            <p className="text-gray-500 mt-2">{data.project.description}</p>
          )}
          {data.expired && (
            <span className="inline-block mt-3 px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full">
              Campaign Ended
            </span>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-sm text-gray-500 mb-1">Total Codes</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {total_codes.toLocaleString()}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-sm text-gray-500 mb-1">Redeemed</div>
            <div className="text-2xl font-bold" style={{ color: accent }}>
              {used_codes.toLocaleString()}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-sm text-gray-500 mb-1">Available</div>
            <div className="text-2xl font-bold text-green-600">
              {available_codes.toLocaleString()}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-sm text-gray-500 mb-1">Claim Rate</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {rate}%
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500">Overall Progress</span>
            <span className="font-medium text-gray-900 dark:text-white">{rate}%</span>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${rate}%`, background: accent }}
            />
          </div>
        </div>

        {/* Platform breakdown */}
        {platformEntries.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              By Platform
            </h2>
            <div className="space-y-3">
              {platformEntries.map(([platform, info]) => {
                const { available, count } = info as { available: boolean; count: number };
                return (
                  <div key={platform} className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">
                      {platformLabels[platform] || platform}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-gray-500">
                        {count} available
                      </span>
                      <span className={`w-2 h-2 rounded-full ${available ? "bg-green-500" : "bg-red-500"}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        {!data.expired && available_codes > 0 && (
          <div className="text-center">
            <Link
              href={`/redeem/${slug}`}
              className="inline-block px-8 py-3 text-white font-semibold rounded-xl transition-opacity hover:opacity-90"
              style={{ background: accent }}
            >
              Get Your Code
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <span className="text-xs text-gray-400">
            Powered by{" "}
            <Link href="/" className="text-brand-600 hover:underline">
              SudoGrab
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
