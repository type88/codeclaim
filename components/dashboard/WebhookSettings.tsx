"use client";

import { useState, useEffect, useCallback } from "react";

interface Webhook {
  id: string;
  url: string;
  secret?: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

interface Delivery {
  id: string;
  event_type: string;
  response_status: number | null;
  success: boolean;
  delivered_at: string;
}

const eventLabels: Record<string, string> = {
  code_redeemed: "Code Redeemed",
  batch_empty: "Batch Empty",
  batch_low: "Batch Low",
  batch_created: "Batch Created",
};

const allEvents = ["code_redeemed", "batch_empty", "batch_low", "batch_created"];

interface WebhookSettingsProps {
  projectId: string;
}

export function WebhookSettings({ projectId }: WebhookSettingsProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>(["code_redeemed"]);
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  // Delivery log
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  const [testing, setTesting] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/webhooks`);
      const data = await response.json();
      if (data.success) {
        setWebhooks(data.data);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to load webhooks");
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const createWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl, events: newEvents }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error);
        setCreating(false);
        return;
      }

      // Show the secret once
      setNewSecret(data.data.secret);
      setWebhooks([data.data, ...webhooks]);
      setNewUrl("");
      setNewEvents(["code_redeemed"]);
      setCreating(false);
    } catch {
      setError("Failed to create webhook");
      setCreating(false);
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!window.confirm("Delete this webhook? Deliveries will also be removed.")) return;

    await fetch(`/api/projects/${projectId}/webhooks/${id}`, { method: "DELETE" });
    setWebhooks(webhooks.filter((w) => w.id !== id));
    if (selectedWebhookId === id) setSelectedWebhookId(null);
  };

  const toggleWebhook = async (id: string, currentActive: boolean) => {
    const response = await fetch(`/api/projects/${projectId}/webhooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !currentActive }),
    });
    const data = await response.json();
    if (data.success) {
      setWebhooks(webhooks.map((w) => (w.id === id ? { ...w, is_active: !currentActive } : w)));
    }
  };

  const testWebhook = async (id: string) => {
    setTesting(id);
    try {
      await fetch(`/api/projects/${projectId}/webhooks/${id}/test`, { method: "POST" });
    } catch {
      // silently fail
    }
    setTesting(null);
    // Refresh deliveries if viewing this webhook
    if (selectedWebhookId === id) {
      fetchDeliveries(id);
    }
  };

  const fetchDeliveries = async (webhookId: string) => {
    setDeliveriesLoading(true);
    setSelectedWebhookId(webhookId);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/webhooks/${webhookId}/deliveries`
      );
      const data = await response.json();
      if (data.success) {
        setDeliveries(data.data);
      }
    } catch {
      // silently fail
    }
    setDeliveriesLoading(false);
  };

  const toggleEvent = (event: string) => {
    setNewEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Webhooks
          </h3>
          <p className="text-sm text-gray-500">
            Receive HTTP callbacks when events happen in your project.
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setNewSecret(null); }}
          className="px-4 py-2 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700"
        >
          Add Webhook
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Secret display (shown once after creation) */}
      {newSecret && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 p-4 rounded-lg">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
            Signing Secret (copy now — shown only once)
          </p>
          <code className="block text-sm bg-yellow-100 dark:bg-yellow-900/40 p-2 rounded font-mono text-yellow-900 dark:text-yellow-200 break-all">
            {newSecret}
          </code>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
            Use this to verify webhook signatures via the <code>X-SudoGrab-Signature</code> header.
          </p>
          <button
            onClick={() => setNewSecret(null)}
            className="mt-2 text-xs text-yellow-700 dark:text-yellow-400 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <form onSubmit={createWebhook} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Endpoint URL *
            </label>
            <input
              type="url"
              required
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://yourserver.com/webhook"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Events
            </label>
            <div className="flex flex-wrap gap-2">
              {allEvents.map((event) => (
                <button
                  key={event}
                  type="button"
                  onClick={() => toggleEvent(event)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    newEvents.includes(event)
                      ? "border-brand-600 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400"
                      : "border-gray-300 dark:border-gray-600 text-gray-500 hover:border-gray-400"
                  }`}
                >
                  {eventLabels[event] || event}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={creating || !newUrl || newEvents.length === 0}
              className="px-4 py-2 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Webhook"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Webhook list */}
      {webhooks.length === 0 && !showCreate ? (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-2">No webhooks configured</p>
          <p className="text-sm">Add a webhook to receive real-time event notifications.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      webhook.is_active ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                  <code className="text-sm text-gray-900 dark:text-white truncate">
                    {webhook.url}
                  </code>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => testWebhook(webhook.id)}
                    disabled={testing === webhook.id}
                    className="text-xs px-2 py-1 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded disabled:opacity-50"
                  >
                    {testing === webhook.id ? "Sending..." : "Test"}
                  </button>
                  <button
                    onClick={() => fetchDeliveries(webhook.id)}
                    className={`text-xs px-2 py-1 rounded ${
                      selectedWebhookId === webhook.id
                        ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                        : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    Log
                  </button>
                  <button
                    onClick={() => toggleWebhook(webhook.id, webhook.is_active)}
                    className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded"
                  >
                    {webhook.is_active ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => deleteWebhook(webhook.id)}
                    className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {webhook.events.map((event) => (
                  <span
                    key={event}
                    className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                  >
                    {eventLabels[event] || event}
                  </span>
                ))}
              </div>

              {/* Delivery log */}
              {selectedWebhookId === webhook.id && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Recent Deliveries</h4>
                  {deliveriesLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600" />
                    </div>
                  ) : deliveries.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">No deliveries yet</p>
                  ) : (
                    <div className="space-y-1">
                      {deliveries.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center gap-3 text-xs py-1"
                        >
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              d.success ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <span className="text-gray-600 dark:text-gray-400 w-24">
                            {eventLabels[d.event_type] || d.event_type}
                          </span>
                          <span className={`font-mono ${d.success ? "text-green-600" : "text-red-500"}`}>
                            {d.response_status || "ERR"}
                          </span>
                          <span className="text-gray-400 ml-auto">
                            {new Date(d.delivered_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
