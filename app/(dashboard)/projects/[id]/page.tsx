"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useProjectRealtime } from "@/lib/hooks/use-realtime";

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
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
  }>;
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
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [csvFile, setCsvFile] = useState<File | null>(null);

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

  useEffect(() => {
    setOrigin(window.location.origin);
    fetchProject();
  }, [projectId, fetchProject]);

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

      {/* Batches */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Code Batches
          </h2>
        </div>

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
