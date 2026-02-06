"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface ProjectInfo {
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
}

interface PlatformAvailability {
  available: boolean;
  count: number;
  app_store_id?: string | null;
  play_store_package?: string | null;
  steam_app_id?: string | null;
}

type PlatformType = "ios" | "android" | "steam" | "web" | "windows" | "macos" | "playstation" | "xbox" | "nintendo";

const platformLabels: Record<PlatformType, string> = {
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

const platformIcons: Record<PlatformType, string> = {
  ios: "🍎",
  android: "🤖",
  steam: "🎮",
  web: "🌐",
  windows: "🪟",
  macos: "💻",
  playstation: "🎯",
  xbox: "🎯",
  nintendo: "🎯",
};

// Generate store redemption URL based on platform
function getStoreRedeemUrl(
  platform: PlatformType,
  code: string,
  storeIds: {
    app_store_id?: string | null;
    play_store_package?: string | null;
    steam_app_id?: string | null;
  }
): string | null {
  switch (platform) {
    case "ios":
      if (storeIds.app_store_id) {
        // iOS App Store promo code redemption URL
        const appId = storeIds.app_store_id.replace(/^id/, "");
        return `https://apps.apple.com/redeem?ctx=offercodes&id=${appId}&code=${encodeURIComponent(code)}`;
      }
      return null;
    case "android":
      if (storeIds.play_store_package) {
        // Google Play Store - link to app page (no direct code redemption)
        return `https://play.google.com/store/apps/details?id=${storeIds.play_store_package}`;
      }
      return null;
    case "steam":
      if (storeIds.steam_app_id) {
        // Steam key activation
        return `https://store.steampowered.com/account/registerkey?key=${encodeURIComponent(code)}`;
      }
      return null;
    default:
      return null;
  }
}

export default function RedeemPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [platforms, setPlatforms] = useState<Record<string, PlatformAvailability>>({});
  const [detectedPlatform, setDetectedPlatform] = useState<PlatformType | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | null>(null);
  const [redeemedCode, setRedeemedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [storeIds, setStoreIds] = useState<{
    app_store_id?: string | null;
    play_store_package?: string | null;
    steam_app_id?: string | null;
  }>({});
  const [requireAuth, setRequireAuth] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchProjectInfo() {
      try {
        const response = await fetch(`/api/redeem/${slug}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!data.success) {
          setError(data.error || "Project not found");
          setLoading(false);
          return;
        }

        setProject(data.data.project);
        setPlatforms(data.data.platforms);
        setDetectedPlatform(data.data.detected_platform);
        setRequireAuth(data.data.require_auth || false);

        // Auto-select detected platform if it has codes
        if (data.data.detected_platform && data.data.has_codes_for_detected) {
          setSelectedPlatform(data.data.detected_platform);
        }

        // If auth is required, check if user is already signed in
        if (data.data.require_auth) {
          setAuthChecking(true);
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          setIsAuthenticated(!!user);
          setAuthChecking(false);
        }

        setLoading(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Network error. Please check your connection and try again.");
        setLoading(false);
      }
    }

    fetchProjectInfo();

    return () => controller.abort();
  }, [slug]);

  const handleRedeem = useCallback(async () => {
    if (!selectedPlatform) return;

    setRedeeming(true);
    setError(null);

    try {
      const response = await fetch(`/api/redeem/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: selectedPlatform }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to get code");
        setRedeeming(false);
        return;
      }

      setRedeemedCode(data.data.code);
      setStoreIds({
        app_store_id: data.data.app_store_id,
        play_store_package: data.data.play_store_package,
        steam_app_id: data.data.steam_app_id,
      });
      setRedeeming(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Network error. Please check your connection and try again.");
      setRedeeming(false);
    }
  }, [slug, selectedPlatform]);

  const storeRedeemUrl = useMemo(
    () =>
      selectedPlatform && redeemedCode
        ? getStoreRedeemUrl(selectedPlatform, redeemedCode, storeIds)
        : null,
    [selectedPlatform, redeemedCode, storeIds]
  );

  const copyToClipboard = async () => {
    if (!redeemedCode) return;

    try {
      await navigator.clipboard.writeText(redeemedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = redeemedCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    setSigningIn(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/redeem/${slug}`,
      },
    });
  };

  // Determine if user needs to authenticate before redeeming
  const needsAuth = requireAuth && !isAuthenticated;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Project Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Link
            href="/"
            className="text-brand-600 hover:text-brand-500 font-medium"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    );
  }

  const availablePlatforms = Object.entries(platforms).filter(
    ([, info]) => info.available
  ) as [PlatformType, PlatformAvailability][];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <nav className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/" className="text-xl font-bold text-brand-600">
            CodeClaim
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Project Info */}
          <div className="text-center mb-8">
            {project?.icon_url && (
              <img
                src={project.icon_url}
                alt={project.name}
                className="w-20 h-20 mx-auto mb-4 rounded-xl"
              />
            )}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {project?.name}
            </h1>
            {project?.description && (
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {project.description}
              </p>
            )}
          </div>

          {/* Auth Gate */}
          {needsAuth ? (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 text-center space-y-4">
              {authChecking ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                </div>
              ) : (
                <>
                  <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Sign in to get your code
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    This project requires sign-in to prevent abuse and ensure fair distribution.
                  </p>
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={() => handleOAuthSignIn("google")}
                      disabled={signingIn}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span className="text-gray-700 dark:text-gray-200 font-medium">
                        Continue with Google
                      </span>
                    </button>
                    <button
                      onClick={() => handleOAuthSignIn("apple")}
                      disabled={signingIn}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                      <span className="text-gray-700 dark:text-gray-200 font-medium">
                        Continue with Apple
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : redeemedCode ? (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 text-center">
              <div className="text-green-600 dark:text-green-400 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Your Code
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 font-mono text-lg break-all">
                {redeemedCode}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={copyToClipboard}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700"
                >
                  {copied ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Code
                    </>
                  )}
                </button>
                {storeRedeemUrl && (
                  <a
                    href={storeRedeemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {selectedPlatform === "ios" ? "Redeem in App Store" :
                     selectedPlatform === "android" ? "Open Play Store" :
                     selectedPlatform === "steam" ? "Activate on Steam" :
                     "Open Store"}
                  </a>
                )}
              </div>
              <p className="mt-4 text-sm text-gray-500">
                {storeRedeemUrl
                  ? selectedPlatform === "android"
                    ? "Copy the code and redeem it in the app"
                    : "Click the button above to redeem automatically"
                  : `Redeem this code in the ${platformLabels[selectedPlatform!]} app`}
              </p>
            </div>
          ) : (
            <>
              {/* Platform Selection */}
              {availablePlatforms.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select your platform
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {availablePlatforms.map(([platform, info]) => (
                        <button
                          key={platform}
                          onClick={() => setSelectedPlatform(platform)}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            selectedPlatform === platform
                              ? "border-brand-600 bg-brand-50 dark:bg-brand-900/20"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{platformIcons[platform]}</span>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {platformLabels[platform]}
                              </div>
                              <div className="text-xs text-gray-500">
                                {info.count} available
                              </div>
                            </div>
                          </div>
                          {platform === detectedPlatform && (
                            <div className="mt-2 text-xs text-brand-600">
                              Detected
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleRedeem}
                    disabled={!selectedPlatform || redeeming}
                    className="w-full py-3 px-4 bg-brand-600 text-white font-medium rounded-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {redeeming ? "Getting your code..." : "Get My Code"}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <svg
                      className="w-16 h-16 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No Codes Available
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    All codes for this project have been claimed. Check back later!
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-4">
        <div className="max-w-3xl mx-auto px-4 text-center text-sm text-gray-500">
          Powered by{" "}
          <Link href="/" className="text-brand-600 hover:underline">
            CodeClaim
          </Link>
        </div>
      </footer>
    </div>
  );
}
