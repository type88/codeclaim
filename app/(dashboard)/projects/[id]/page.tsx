"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useProjectRealtime } from "@/lib/hooks/use-realtime";
import { PromotionalSettings } from "@/components/dashboard/PromotionalSettings";
import { WebhookSettings } from "@/components/dashboard/WebhookSettings";
import { ShareSettings } from "@/components/dashboard/ShareSettings";

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  require_auth: boolean;
  low_code_threshold: number;
  // Promotional fields
  hero_image_url: string | null;
  promo_headline: string | null;
  promo_description: string | null;
  cta_text: string | null;
  show_social_proof: boolean;
  social_proof_style: string;
  developer_logo_url: string | null;
  theme_color: string | null;
  // Expiring links
  expires_at: string | null;
  // Notification settings
  email_notifications_enabled: boolean;
  notify_on_batch_low: boolean;
  notify_on_batch_empty: boolean;
  notify_on_milestones: boolean;
  // Bundles
  enable_bundles: boolean;
  retain_redeemer_email: boolean;
  created_at: string;
  stats: {
    total_batches: number;
    total_codes: number;
    used_codes: number;
    available_codes: number;
    redemption_rate: number;
    codes_by_platform: Record<string, { total: number; used: number }>;
  };
  code_batches: Array<{
    id: string;
    name: string;
    platform: string;
    status: string;
    total_codes: number;
    used_codes: number;
    expires_at: string | null;
    created_at: string;
    developer_reserved_code?: string | null;
  }>;
}

interface AnalyticsData {
  daily_counts: { day: string; count: number }[];
  platform_stats: Record<string, { total: number; success: number; failed: number }>;
  success_rate: number;
  total_redemptions: number;
  total_success: number;
  recent_activity: {
    created_at: string;
    requested_platform: string;
    success: boolean;
    failure_reason: string | null;
  }[];
}

type PlatformType = "ios" | "android" | "steam" | "web" | "windows" | "macos" | "playstation" | "xbox" | "nintendo";

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

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add codes modal state
  const [showAddCodes, setShowAddCodes] = useState(false);
  const [addingCodes, setAddingCodes] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [platform, setPlatform] = useState<PlatformType>("ios");
  const [codesText, setCodesText] = useState("");
  const [storeId, setStoreId] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [togglingAuth, setTogglingAuth] = useState(false);
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"batches" | "analytics" | "promotional" | "webhooks" | "share" | "redeemers">("batches");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [redeemers, setRedeemers] = useState<{ email: string; platform: string; redeemed_at: string }[] | null>(null);
  const [redeemersLoading, setRedeemersLoading] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setProject(data.data);
      setLoading(false);
    } catch {
      setError("Failed to load project");
      setLoading(false);
    }
  }, [projectId]);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/analytics`);
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      } else {
        setAnalyticsError(data.error || "Failed to load analytics");
      }
    } catch {
      setAnalyticsError("Failed to load analytics");
    }
    setAnalyticsLoading(false);
  }, [projectId]);

  useEffect(() => {
    setOrigin(window.location.origin);
    fetchProject();
  }, [projectId, fetchProject]);

  useEffect(() => {
    if (activeTab === "analytics" && !analytics) {
      fetchAnalytics();
    }
  }, [activeTab, analytics, fetchAnalytics]);

  const fetchRedeemers = useCallback(async () => {
    setRedeemersLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/redeemers`);
      const data = await response.json();
      if (data.success) {
        setRedeemers(data.data);
      }
    } catch {
      // silently fail
    }
    setRedeemersLoading(false);
  }, [projectId]);

  useEffect(() => {
    if (activeTab === "redeemers" && !redeemers) {
      fetchRedeemers();
    }
  }, [activeTab, redeemers, fetchRedeemers]);

  // Real-time updates for code redemptions
  const { isConnected: isRealtimeConnected } = useProjectRealtime(projectId, fetchProject);

  const parseCSVFile = async (file: File): Promise<string[]> => {
    const text = await file.text();
    const lines = text.split(/\r?\n/);
    const codes: string[] = [];

    const headerPatterns = /^(code|codes|promo[_ ]?code|redemption[_ ]?code|key|serial|voucher|coupon)s?$/i;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;

      // Handle CSV with multiple columns - take first column
      const columns = trimmed.split(",");
      const firstCol = columns[0].trim().replace(/^["']|["']$/g, "");

      // Skip header row (only check first non-empty line)
      if (i === 0 && headerPatterns.test(firstCol)) {
        continue;
      }

      if (firstCol) {
        codes.push(firstCol);
      }
    }
    return codes;
  };

  const handleAddCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingCodes(true);
    setAddError(null);

    let codes: string[] = [];

    if (inputMode === "file" && csvFile) {
      try {
        codes = await parseCSVFile(csvFile);
      } catch {
        setAddError("Failed to parse CSV file");
        setAddingCodes(false);
        return;
      }
    } else {
      // Parse codes (split by newline, comma, or semicolon)
      codes = codesText
        .split(/[\n,;]+/)
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
    }

    if (codes.length === 0) {
      setAddError("Please enter at least one code");
      setAddingCodes(false);
      return;
    }

    // Build request body with appropriate store ID field
    const requestBody: Record<string, unknown> = {
      name: batchName,
      platform,
      codes,
    };

    // Add store ID based on platform
    if (storeId.trim()) {
      if (platform === "ios") {
        requestBody.app_store_id = storeId.trim();
      } else if (platform === "android") {
        requestBody.play_store_package = storeId.trim();
      } else if (platform === "steam") {
        requestBody.steam_app_id = storeId.trim();
      }
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/batches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!data.success) {
        setAddError(data.error);
        setAddingCodes(false);
        return;
      }

      // Reset form and refresh project
      setBatchName("");
      setCodesText("");
      setStoreId("");
      setCsvFile(null);
      setInputMode("text");
      setShowAddCodes(false);
      setAddingCodes(false);
      fetchProject();
    } catch {
      setAddError("Failed to add codes. Please try again.");
      setAddingCodes(false);
    }
  };

  const copyRedeemLink = async () => {
    const link = `${origin}/redeem/${project?.slug}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeleteBatch = async (batchId: string, batchName: string) => {
    if (!window.confirm(`Delete "${batchName}"? Codes will no longer be distributed.`)) return;
    setDeletingBatchId(batchId);
    try {
      const response = await fetch(`/api/projects/${projectId}/batches/${batchId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success && project) {
        setProject({
          ...project,
          code_batches: project.code_batches.filter((b) => b.id !== batchId),
        });
      } else if (!data.success) {
        setError(data.error || "Failed to delete batch");
      }
    } catch {
      setError("Failed to delete batch");
    }
    setDeletingBatchId(null);
  };

  const toggleRequireAuth = async () => {
    if (!project) return;
    setTogglingAuth(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ require_auth: !project.require_auth }),
      });
      const data = await response.json();
      if (data.success) {
        setProject({ ...project, require_auth: !project.require_auth });
      }
    } catch {
      // silently fail
    }
    setTogglingAuth(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Project not found
        </h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <Link href="/projects" className="text-brand-600 hover:underline">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {project.name}
              </h1>
              {isRealtimeConnected && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Redeem link:{" "}
              <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-brand-600">
                {origin}/redeem/{project.slug}
              </code>
            </p>
            {/* Require Auth Toggle */}
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={toggleRequireAuth}
                disabled={togglingAuth}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  project.require_auth ? "bg-brand-600" : "bg-gray-300 dark:bg-gray-600"
                } ${togglingAuth ? "opacity-50" : ""}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    project.require_auth ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Require sign-in to redeem
              </span>
              <span className="text-xs text-gray-400" title="Users must sign in with Google or Apple before getting a code. Prevents bots but adds friction.">
                (?)
              </span>
            </div>
            {/* Low code threshold */}
            <div className="mt-2 flex items-center gap-3">
              <label className="text-sm text-gray-600 dark:text-gray-400">
                Low code alert at:
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={project.low_code_threshold}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (isNaN(val) || val < 1) return;
                  setProject({ ...project, low_code_threshold: val });
                }}
                onBlur={async (e) => {
                  const val = parseInt(e.target.value, 10);
                  if (isNaN(val) || val < 1) return;
                  await fetch(`/api/projects/${projectId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ low_code_threshold: val }),
                  });
                }}
                className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span className="text-xs text-gray-400" title="Show a warning banner when a batch has fewer available codes than this number">
                (?)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={copyRedeemLink}
              className={`inline-flex items-center gap-2 px-4 py-2 border rounded-md transition-colors ${
                copied
                  ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20"
                  : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </>
              )}
            </button>
            <button
              onClick={() => setShowAddCodes(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Codes
            </button>
          </div>
        </div>
      </div>

      {/* Low Code Warnings */}
      {project.code_batches && project.code_batches.length > 0 && (() => {
        const warnings = project.code_batches
          .map((b) => ({ ...b, remaining: b.total_codes - b.used_codes }))
          .filter((b) => b.remaining <= project.low_code_threshold);
        if (warnings.length === 0) return null;
        return (
          <div className="mb-6 space-y-2">
            {warnings.map((b) => (
              <div
                key={b.id}
                className={`px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
                  b.remaining <= 0
                    ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                    : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800"
                }`}
              >
                <span>{b.remaining <= 0 ? "\u{1F6AB}" : "\u{26A0}\u{FE0F}"}</span>
                <span>
                  {b.remaining <= 0
                    ? <><strong>{b.name}</strong> has no codes left</>
                    : <><strong>{b.name}</strong> has only {b.remaining} code{b.remaining !== 1 ? "s" : ""} remaining</>
                  }
                </span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-500">Total Codes</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {project.stats.total_codes.toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-500">Redeemed</div>
          <div className="mt-2 text-3xl font-bold text-green-600">
            {project.stats.used_codes.toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-500">Available</div>
          <div className="mt-2 text-3xl font-bold text-brand-600">
            {project.stats.available_codes.toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-500">Redemption Rate</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {project.stats.redemption_rate}%
          </div>
        </div>
      </div>

      {/* Platform Breakdown */}
      {Object.keys(project.stats.codes_by_platform || {}).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Codes by Platform
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(project.stats.codes_by_platform).map(([platform, stats]) => (
              <div key={platform} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-sm font-medium text-gray-500 mb-1">
                  {platformLabels[platform] || platform}
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats.used} / {stats.total}
                </div>
                <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-600 rounded-full"
                    style={{ width: `${stats.total > 0 ? (stats.used / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 border-b border-gray-200 dark:border-gray-700 flex gap-0">
          <button
            onClick={() => setActiveTab("batches")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "batches"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Batches
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "analytics"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("promotional")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "promotional"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Promotional
          </button>
          <button
            onClick={() => setActiveTab("webhooks")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "webhooks"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Webhooks
          </button>
          <button
            onClick={() => setActiveTab("share")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "share"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Share
          </button>
          {project.retain_redeemer_email && (
            <button
              onClick={() => setActiveTab("redeemers")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "redeemers"
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Redeemers
            </button>
          )}
        </div>

        {activeTab === "batches" && (
          <>
            {project.code_batches && project.code_batches.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {project.code_batches.map((batch) => {
                  const rate = batch.total_codes > 0
                    ? Math.round((batch.used_codes / batch.total_codes) * 100)
                    : 0;

                  return (
                    <div key={batch.id} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {platformLabels[batch.platform]?.[0] || batch.platform[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {batch.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {platformLabels[batch.platform] || batch.platform} • {batch.used_codes} / {batch.total_codes} used
                          </div>
                          {batch.developer_reserved_code && (
                            <div className="mt-1 text-xs text-gray-400 font-mono">
                              Your code: {batch.developer_reserved_code}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="w-32">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-500">{rate}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-600 rounded-full"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>

                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          batch.status === "completed"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : batch.status === "processing"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400"
                        }`}>
                          {batch.status}
                        </div>

                        <button
                          onClick={() => handleDeleteBatch(batch.id, batch.name)}
                          disabled={deletingBatchId === batch.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Delete batch"
                        >
                          {deletingBatchId === batch.id ? (
                            <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-500" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500 mb-4">No code batches yet</p>
                <button
                  onClick={() => setShowAddCodes(true)}
                  className="text-brand-600 hover:underline"
                >
                  Add your first batch of codes
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === "analytics" && (
          <div className="p-6">
            {analyticsLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
              </div>
            ) : analyticsError ? (
              <div className="text-center py-12">
                <p className="text-red-500 mb-2">{analyticsError}</p>
                <button onClick={fetchAnalytics} className="text-brand-600 hover:underline text-sm">
                  Try again
                </button>
              </div>
            ) : !analytics ? (
              <p className="text-center text-gray-500 py-12">No analytics data available</p>
            ) : (
              <div className="space-y-8">
                {/* Success Rate + Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                    <div className="text-sm text-gray-500 mb-1">Total Attempts</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {analytics.total_redemptions}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                    <div className="text-sm text-gray-500 mb-1">Successful</div>
                    <div className="text-2xl font-bold text-green-600">
                      {analytics.total_success}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                    <div className="text-sm text-gray-500 mb-1">Success Rate</div>
                    <div className={`text-2xl font-bold ${
                      analytics.success_rate >= 90
                        ? "text-green-600"
                        : analytics.success_rate >= 70
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}>
                      {analytics.success_rate}%
                    </div>
                  </div>
                </div>

                {/* Daily Redemptions Chart (CSS bars) */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Daily Redemptions (Last 30 Days)
                  </h3>
                  {(() => {
                    const maxCount = Math.max(...analytics.daily_counts.map((d) => d.count), 1);
                    return (
                      <div className="flex items-end gap-[2px] h-32">
                        {analytics.daily_counts.map((d) => (
                          <div
                            key={d.day}
                            className="flex-1 group relative"
                            style={{ height: "100%" }}
                          >
                            <div
                              className="absolute bottom-0 w-full bg-brand-500 dark:bg-brand-400 rounded-t-sm transition-all hover:bg-brand-600 dark:hover:bg-brand-300"
                              style={{ height: `${Math.max((d.count / maxCount) * 100, d.count > 0 ? 4 : 0)}%` }}
                            />
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                              {d.day.slice(5)}: {d.count}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <div className="flex justify-between mt-1 text-xs text-gray-400">
                    <span>{analytics.daily_counts[0]?.day.slice(5)}</span>
                    <span>{analytics.daily_counts[analytics.daily_counts.length - 1]?.day.slice(5)}</span>
                  </div>
                </div>

                {/* Platform Breakdown Table */}
                {Object.keys(analytics.platform_stats).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      By Platform
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                            <th className="pb-2 font-medium">Platform</th>
                            <th className="pb-2 font-medium text-right">Total</th>
                            <th className="pb-2 font-medium text-right">Success</th>
                            <th className="pb-2 font-medium text-right">Failed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                          {Object.entries(analytics.platform_stats).map(([p, s]) => (
                            <tr key={p}>
                              <td className="py-2 text-gray-900 dark:text-white">
                                {platformLabels[p] || p}
                              </td>
                              <td className="py-2 text-right text-gray-600 dark:text-gray-300">{s.total}</td>
                              <td className="py-2 text-right text-green-600">{s.success}</td>
                              <td className="py-2 text-right text-red-500">{s.failed}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                {analytics.recent_activity.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Recent Activity
                    </h3>
                    <div className="space-y-2">
                      {analytics.recent_activity.map((a, i) => {
                        const ago = getRelativeTime(a.created_at);
                        return (
                          <div key={i} className="flex items-center gap-3 text-sm">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.success ? "bg-green-500" : "bg-red-500"}`} />
                            <span className="text-gray-500 w-24 flex-shrink-0">{ago}</span>
                            <span className="text-gray-900 dark:text-white">
                              {platformLabels[a.requested_platform] || a.requested_platform}
                            </span>
                            {!a.success && a.failure_reason && (
                              <span className="text-red-500 text-xs">{a.failure_reason}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {activeTab === "webhooks" && (
          <WebhookSettings projectId={project.id} />
        )}
        {activeTab === "share" && (
          <ShareSettings projectId={project.id} slug={project.slug} themeColor={project.theme_color} />
        )}
        {activeTab === "redeemers" && (
          <div className="p-6">
            {redeemersLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
              </div>
            ) : !redeemers || redeemers.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-gray-500">No redeemer emails captured yet.</p>
                <p className="text-sm text-gray-400 mt-1">Emails appear here after authenticated users redeem codes.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {redeemers.length} redeemer{redeemers.length !== 1 ? "s" : ""}
                  </h3>
                  <button
                    onClick={() => {
                      const csv = ["Email,Platform,Redeemed At", ...redeemers.map(r => `${r.email},${r.platform},${r.redeemed_at}`)].join("\n");
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `redeemers-${project.slug}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                        <th className="pb-2 font-medium">Email</th>
                        <th className="pb-2 font-medium">Platform</th>
                        <th className="pb-2 font-medium">Redeemed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {redeemers.map((r, i) => (
                        <tr key={i}>
                          <td className="py-2 text-gray-900 dark:text-white">{r.email}</td>
                          <td className="py-2 text-gray-600 dark:text-gray-300">
                            {platformLabels[r.platform] || r.platform}
                          </td>
                          <td className="py-2 text-gray-500">{getRelativeTime(r.redeemed_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
        {activeTab === "promotional" && (
          <PromotionalSettings
            projectId={project.id}
            initial={{
              hero_image_url: project.hero_image_url,
              promo_headline: project.promo_headline,
              promo_description: project.promo_description,
              cta_text: project.cta_text,
              show_social_proof: project.show_social_proof ?? true,
              social_proof_style: project.social_proof_style ?? "claimed",
              developer_logo_url: project.developer_logo_url,
              theme_color: project.theme_color,
              expires_at: project.expires_at,
              email_notifications_enabled: project.email_notifications_enabled ?? false,
              notify_on_batch_low: project.notify_on_batch_low ?? true,
              notify_on_batch_empty: project.notify_on_batch_empty ?? true,
              notify_on_milestones: project.notify_on_milestones ?? true,
              enable_bundles: project.enable_bundles ?? false,
              retain_redeemer_email: project.retain_redeemer_email ?? false,
            }}
            onSaved={fetchProject}
          />
        )}
      </div>

      {/* Add Codes Modal */}
      {showAddCodes && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Codes
              </h3>
              <button
                onClick={() => setShowAddCodes(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddCodes} className="p-6 space-y-4">
              {addError && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
                  {addError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Batch Name *
                </label>
                <input
                  type="text"
                  required
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="e.g., Launch Week Codes"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Platform *
                </label>
                <select
                  value={platform}
                  onChange={(e) => {
                    setPlatform(e.target.value as PlatformType);
                    setStoreId("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="ios">iOS</option>
                  <option value="android">Android</option>
                  <option value="steam">Steam</option>
                  <option value="web">Web</option>
                  <option value="windows">Windows</option>
                  <option value="macos">macOS</option>
                  <option value="playstation">PlayStation</option>
                  <option value="xbox">Xbox</option>
                  <option value="nintendo">Nintendo</option>
                </select>
              </div>

              {(platform === "ios" || platform === "android" || platform === "steam") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {platform === "ios" ? "App Store ID" : platform === "android" ? "Play Store Package" : "Steam App ID"}
                    <span className="text-gray-400 font-normal ml-1">(for direct redemption)</span>
                  </label>
                  <input
                    type="text"
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    placeholder={platform === "ios" ? "e.g., 123456789" : platform === "android" ? "e.g., com.example.app" : "e.g., 730"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {platform === "ios" ? "Numeric ID from apps.apple.com/app/id123456789" : platform === "android" ? "Package name from Play Store URL" : "App ID from store.steampowered.com/app/730"}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Codes *
                </label>

                {/* Input mode toggle */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setInputMode("text")}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md border ${
                      inputMode === "text"
                        ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400"
                        : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    Paste Codes
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("file")}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md border ${
                      inputMode === "file"
                        ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400"
                        : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    Upload CSV
                  </button>
                </div>

                {inputMode === "text" ? (
                  <>
                    <textarea
                      required={inputMode === "text"}
                      value={codesText}
                      onChange={(e) => setCodesText(e.target.value)}
                      rows={8}
                      placeholder="Enter codes, one per line or separated by commas"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {codesText.split(/[\n,;]+/).filter((c) => c.trim().length > 0).length} codes detected
                    </p>
                  </>
                ) : (
                  <>
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="csv-upload"
                      />
                      <label
                        htmlFor="csv-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        {csvFile ? (
                          <span className="text-brand-600 font-medium">{csvFile.name}</span>
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400">
                            Click to upload CSV or TXT file
                          </span>
                        )}
                      </label>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      CSV should have codes in the first column (one per row). Header row is optional.
                    </p>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddCodes(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingCodes}
                  className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
                >
                  {addingCodes ? "Adding..." : "Add Codes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
