"use client";

import { useState, useCallback } from "react";
import { ImageUploadField } from "@/components/forms/ImageUploadField";

interface PromotionalData {
  hero_image_url: string | null;
  promo_headline: string | null;
  promo_description: string | null;
  cta_text: string | null;
  show_social_proof: boolean;
  social_proof_style: string;
  developer_logo_url: string | null;
  theme_color: string | null;
  expires_at: string | null;
  email_notifications_enabled: boolean;
  notify_on_batch_low: boolean;
  notify_on_batch_empty: boolean;
  notify_on_milestones: boolean;
  enable_bundles: boolean;
}

interface PromotionalSettingsProps {
  projectId: string;
  initial: PromotionalData;
  onSaved: () => void;
}

export function PromotionalSettings({ projectId, initial, onSaved }: PromotionalSettingsProps) {
  const [data, setData] = useState<PromotionalData>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof PromotionalData, value: unknown) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || "Failed to save");
        setSaving(false);
        return;
      }

      setSaving(false);
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }, [projectId, data, onSaved]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Customize Your Redemption Page
        </h3>
        <p className="text-sm text-gray-500">
          Make your code distribution page look professional. These settings are visible to anyone visiting your redemption link.
        </p>
      </div>

      {/* Hero Image */}
      <ImageUploadField
        label="Hero Banner"
        value={data.hero_image_url}
        onChange={(url) => update("hero_image_url", url)}
        hint="A wide banner image shown at the top of your redemption page. Recommended: 1200x400px."
        aspectRatio="banner"
      />

      {/* Developer Logo */}
      <ImageUploadField
        label="Logo"
        value={data.developer_logo_url}
        onChange={(url) => update("developer_logo_url", url)}
        hint="Your company or app logo. Shown in the page header."
        aspectRatio="square"
      />

      {/* Headline */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Headline
        </label>
        <input
          type="text"
          value={data.promo_headline || ""}
          onChange={(e) => update("promo_headline", e.target.value || null)}
          placeholder="e.g., Get your free premium month"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          maxLength={120}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <p className="text-xs text-gray-500 mb-1">Markdown supported. Describe what the user is getting.</p>
        <textarea
          value={data.promo_description || ""}
          onChange={(e) => update("promo_description", e.target.value || null)}
          placeholder="Tell users what they'll get when they redeem a code..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* CTA Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Button Text
        </label>
        <input
          type="text"
          value={data.cta_text || ""}
          onChange={(e) => update("cta_text", e.target.value || null)}
          placeholder="Get My Code"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          maxLength={40}
        />
      </div>

      {/* Theme Color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Accent Color
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={data.theme_color || "#6366f1"}
            onChange={(e) => update("theme_color", e.target.value)}
            className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
          />
          <input
            type="text"
            value={data.theme_color || "#6366f1"}
            onChange={(e) => update("theme_color", e.target.value)}
            className="w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
            maxLength={7}
          />
        </div>
      </div>

      {/* Social Proof */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Social Proof
            </label>
            <p className="text-xs text-gray-500">Show code claim stats to create urgency</p>
          </div>
          <button
            type="button"
            onClick={() => update("show_social_proof", !data.show_social_proof)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              data.show_social_proof ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                data.show_social_proof ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {data.show_social_proof && (
          <div className="flex gap-3 ml-0">
            <button
              type="button"
              onClick={() => update("social_proof_style", "claimed")}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                data.social_proof_style === "claimed"
                  ? "border-brand-600 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400"
                  : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
              }`}
            >
              &ldquo;47 codes claimed&rdquo;
            </button>
            <button
              type="button"
              onClick={() => update("social_proof_style", "remaining")}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                data.social_proof_style === "remaining"
                  ? "border-brand-600 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400"
                  : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
              }`}
            >
              &ldquo;12 codes remaining&rdquo;
            </button>
          </div>
        )}
      </div>

      {/* Expiration Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Campaign Expiration
        </label>
        <p className="text-xs text-gray-500 mb-2">
          After this date, the redemption page shows &ldquo;Campaign ended&rdquo; and no new codes are distributed.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="datetime-local"
            value={data.expires_at ? data.expires_at.slice(0, 16) : ""}
            onChange={(e) => update("expires_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          {data.expires_at && (
            <button
              type="button"
              onClick={() => update("expires_at", null)}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          )}
        </div>
        {data.expires_at && new Date(data.expires_at) < new Date() && (
          <p className="mt-1 text-xs text-red-500">This campaign has already expired.</p>
        )}
      </div>

      {/* Multi-Code Bundles */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Multi-Code Bundles
            </h3>
            <p className="text-sm text-gray-500">
              Let users select multiple platforms and get one code per platform in a single redemption.
            </p>
          </div>
          <button
            type="button"
            onClick={() => update("enable_bundles", !data.enable_bundles)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              data.enable_bundles ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                data.enable_bundles ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>


      {/* Notification Settings */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Notifications
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Get notified about important events for this project.
        </p>

        <div className="space-y-3">
          {/* Master toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable notifications
              </span>
              <p className="text-xs text-gray-500">Master toggle for all notification types</p>
            </div>
            <button
              type="button"
              onClick={() => update("email_notifications_enabled", !data.email_notifications_enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                data.email_notifications_enabled ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  data.email_notifications_enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {data.email_notifications_enabled && (
            <div className="ml-4 space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Batch running low
                </span>
                <button
                  type="button"
                  onClick={() => update("notify_on_batch_low", !data.notify_on_batch_low)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    data.notify_on_batch_low ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      data.notify_on_batch_low ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Batch empty
                </span>
                <button
                  type="button"
                  onClick={() => update("notify_on_batch_empty", !data.notify_on_batch_empty)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    data.notify_on_batch_empty ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      data.notify_on_batch_empty ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Redemption milestones (100, 500, 1K, 5K, 10K)
                </span>
                <button
                  type="button"
                  onClick={() => update("notify_on_milestones", !data.notify_on_milestones)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    data.notify_on_milestones ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      data.notify_on_milestones ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
      </button>
    </div>
  );
}
