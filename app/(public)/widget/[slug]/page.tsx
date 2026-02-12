"use client";

import { useState, useEffect, useCallback } from "react";

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

interface WidgetData {
  project: { name: string; slug: string; theme_color: string | null; cta_text: string | null };
  platforms: Record<string, { available: boolean; count: number }>;
  detected_platform: string | null;
  expired: boolean;
}

export default function WidgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string>("");
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<string>("");
  const [redeeming, setRedeeming] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
        // Auto-select detected platform if available
        if (json.data.detected_platform && json.data.platforms[json.data.detected_platform]?.available) {
          setPlatform(json.data.detected_platform);
        } else {
          // Select first available
          const firstAvailable = Object.entries(json.data.platforms).find(
            ([, info]) => (info as { available: boolean }).available
          );
          if (firstAvailable) setPlatform(firstAvailable[0]);
        }
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

  const handleRedeem = async () => {
    if (!platform) return;
    setRedeeming(true);
    setError(null);

    try {
      const response = await fetch(`/api/redeem/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });

      const json = await response.json();

      if (json.success) {
        setCode(json.data.code);
      } else {
        setError(json.error || "Failed to get code");
      }
    } catch {
      setError("Network error");
    }
    setRedeeming(false);
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const accent = data?.project.theme_color || "#6366f1";

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ width: 24, height: 24, border: `3px solid ${accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "system-ui, sans-serif", color: "#6b7280", fontSize: 14 }}>
        {error}
      </div>
    );
  }

  if (!data || data.expired) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "system-ui, sans-serif", color: "#6b7280", fontSize: 14 }}>
        {data?.expired ? "Campaign ended" : "Not found"}
      </div>
    );
  }

  const availablePlatforms = Object.entries(data.platforms).filter(
    ([, info]) => (info as { available: boolean }).available
  );

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: 16, maxWidth: 400, margin: "0 auto" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; }
        @media (prefers-color-scheme: dark) { body { background: #1f2937; color: #f9fafb; } }
      `}</style>

      {/* Project name */}
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "#111827" }}>
        {data.project.name}
      </div>

      {code ? (
        /* Success state */
        <div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>Your code:</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code style={{ flex: 1, padding: "10px 12px", background: "#f3f4f6", borderRadius: 8, fontSize: 16, fontWeight: 600, fontFamily: "monospace", letterSpacing: 1 }}>
              {code}
            </code>
            <button
              onClick={copyCode}
              style={{ padding: "10px 16px", background: accent, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <a
            href={`/redeem/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "block", marginTop: 12, fontSize: 12, color: accent, textDecoration: "none" }}
          >
            Open full page
          </a>
        </div>
      ) : (
        /* Redeem form */
        <div>
          {availablePlatforms.length > 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {availablePlatforms.map(([p]) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                    border: `1.5px solid ${platform === p ? accent : "#d1d5db"}`,
                    borderRadius: 6,
                    background: platform === p ? `${accent}15` : "transparent",
                    color: platform === p ? accent : "#6b7280",
                    cursor: "pointer",
                  }}
                >
                  {platformLabels[p] || p}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 8 }}>{error}</div>
          )}

          <button
            onClick={handleRedeem}
            disabled={redeeming || !platform}
            style={{
              width: "100%",
              padding: "10px 16px",
              background: redeeming || !platform ? "#9ca3af" : accent,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: redeeming || !platform ? "not-allowed" : "pointer",
            }}
          >
            {redeeming ? "Getting code..." : (data.project.cta_text || "Get My Code")}
          </button>

          <div style={{ marginTop: 8, textAlign: "center" }}>
            <a
              href={`/redeem/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, color: "#9ca3af", textDecoration: "none" }}
            >
              Powered by SudoGrab
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
