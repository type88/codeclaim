"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "qrcode";

interface ShareSettingsProps {
  projectId: string;
  slug: string;
  themeColor: string | null;
}

export function ShareSettings({ projectId, slug, themeColor }: ShareSettingsProps) {
  const [origin, setOrigin] = useState("");
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedBadge, setCopiedBadge] = useState(false);
  const [embedWidth, setEmbedWidth] = useState("400");
  const [embedHeight, setEmbedHeight] = useState("300");
  const [qrSize, setQrSize] = useState<256 | 512 | 1024>(512);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const generateQR = useCallback(async () => {
    if (!origin || !qrCanvasRef.current) return;
    const redeemUrl = `${origin}/redeem/${slug}`;
    try {
      await QRCode.toCanvas(qrCanvasRef.current, redeemUrl, {
        width: qrSize,
        margin: 2,
        color: {
          dark: themeColor || "#000000",
          light: "#ffffff",
        },
      });
    } catch {
      // silently fail
    }
  }, [origin, slug, qrSize, themeColor]);

  useEffect(() => {
    generateQR();
  }, [generateQR]);

  const downloadQR = async (format: "png" | "svg") => {
    if (!origin) return;
    const redeemUrl = `${origin}/redeem/${slug}`;

    if (format === "svg") {
      const svgStr = await QRCode.toString(redeemUrl, {
        type: "svg",
        width: qrSize,
        margin: 2,
        color: {
          dark: themeColor || "#000000",
          light: "#ffffff",
        },
      });
      const blob = new Blob([svgStr], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-qr.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const dataUrl = await QRCode.toDataURL(redeemUrl, {
        width: qrSize,
        margin: 2,
        color: {
          dark: themeColor || "#000000",
          light: "#ffffff",
        },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${slug}-qr-${qrSize}px.png`;
      a.click();
    }
  };

  const embedCode = `<iframe src="${origin}/widget/${slug}" width="${embedWidth}" height="${embedHeight}" frameborder="0" style="border-radius:12px;border:1px solid #e5e7eb;"></iframe>`;

  const badgeMarkdown = `[![Codes Available](${origin}/api/badge/${slug})](${origin}/redeem/${slug})`;
  const badgeHtml = `<a href="${origin}/redeem/${slug}"><img src="${origin}/api/badge/${slug}" alt="Codes Available" /></a>`;

  const copyToClipboard = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Embed Widget */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Embed Widget
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Add a code redemption widget to any website. Users can grab codes directly from the embed.
        </p>

        {/* Preview */}
        {origin && (
          <div className="mb-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-2">Preview</p>
            <iframe
              src={`${origin}/widget/${slug}`}
              width={embedWidth}
              height={embedHeight}
              style={{ borderRadius: 12, border: "1px solid #e5e7eb", maxWidth: "100%" }}
            />
          </div>
        )}

        {/* Size controls */}
        <div className="flex items-center gap-4 mb-3">
          <div>
            <label className="text-xs text-gray-500">Width</label>
            <input
              type="number"
              value={embedWidth}
              onChange={(e) => setEmbedWidth(e.target.value)}
              className="ml-2 w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Height</label>
            <input
              type="number"
              value={embedHeight}
              onChange={(e) => setEmbedHeight(e.target.value)}
              className="ml-2 w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Code */}
        <div className="relative">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto font-mono">
            {embedCode}
          </pre>
          <button
            onClick={() => copyToClipboard(embedCode, setCopiedEmbed)}
            className="absolute top-2 right-2 px-3 py-1 bg-gray-700 text-gray-200 text-xs rounded hover:bg-gray-600"
          >
            {copiedEmbed ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Badge */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Status Badge
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Add a GitHub-style badge to your README or website showing code availability.
        </p>

        {/* Badge preview */}
        {origin && (
          <div className="mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${origin}/api/badge/${slug}`}
              alt="Codes Available"
              className="h-5"
            />
          </div>
        )}

        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Markdown</p>
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto font-mono">
                {badgeMarkdown}
              </pre>
              <button
                onClick={() => copyToClipboard(badgeMarkdown, setCopiedBadge)}
                className="absolute top-1.5 right-1.5 px-2 py-0.5 bg-gray-700 text-gray-200 text-xs rounded hover:bg-gray-600"
              >
                {copiedBadge ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">HTML</p>
            <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto font-mono">
              {badgeHtml}
            </pre>
          </div>
        </div>
      </div>

      {/* Public Stats Page */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Public Stats Page
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Share your campaign stats publicly. No sensitive data is exposed.
        </p>
        {origin && (
          <a
            href={`${origin}/stats/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-600 hover:underline"
          >
            {origin}/stats/{slug}
          </a>
        )}
      </div>

      {/* QR Code */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          QR Code
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Print or share a QR code that links to your redemption page. Colored with your theme color.
        </p>

        {/* QR Preview */}
        <div className="flex items-start gap-6">
          <div className="bg-white p-3 rounded-lg border border-gray-200 inline-block">
            <canvas ref={qrCanvasRef} style={{ width: 160, height: 160 }} />
          </div>

          <div className="space-y-3">
            {/* Size selector */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Size</label>
              <div className="flex gap-2">
                {([256, 512, 1024] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setQrSize(size)}
                    className={`px-3 py-1.5 text-xs font-medium rounded border ${
                      qrSize === size
                        ? "border-brand-600 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400"
                        : "border-gray-300 dark:border-gray-600 text-gray-500 hover:border-gray-400"
                    }`}
                  >
                    {size}px
                  </button>
                ))}
              </div>
            </div>

            {/* Download buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => downloadQR("png")}
                className="px-4 py-2 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700"
              >
                Download PNG
              </button>
              <button
                onClick={() => downloadQR("svg")}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Download SVG
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
