"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeOptions<T> {
  table: string;
  schema?: string;
  event?: RealtimeEvent;
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: { old: T; new: T }) => void;
  onDelete?: (payload: T) => void;
}

export function useRealtime<T extends Record<string, unknown>>({
  table,
  schema = "public",
  event = "*",
  filter,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeOptions<T>) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Use refs for callbacks to avoid re-subscribing on every render
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);
  onInsertRef.current = onInsert;
  onUpdateRef.current = onUpdate;
  onDeleteRef.current = onDelete;

  useEffect(() => {
    const supabase = createClient();

    const channelConfig: {
      event: RealtimeEvent;
      schema: string;
      table: string;
      filter?: string;
    } = {
      event,
      schema,
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const newChannel = supabase
      .channel(`realtime-${table}-${Date.now()}`)
      .on(
        "postgres_changes" as const,
        channelConfig,
        (payload: RealtimePostgresChangesPayload<T>) => {
          if (payload.eventType === "INSERT" && onInsertRef.current) {
            onInsertRef.current(payload.new as T);
          } else if (payload.eventType === "UPDATE" && onUpdateRef.current) {
            onUpdateRef.current({
              old: payload.old as T,
              new: payload.new as T,
            });
          } else if (payload.eventType === "DELETE" && onDeleteRef.current) {
            onDeleteRef.current(payload.old as T);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
    };
  }, [table, schema, event, filter]);

  const unsubscribe = useCallback(() => {
    if (channel) {
      channel.unsubscribe();
      setChannel(null);
      setIsConnected(false);
    }
  }, [channel]);

  return { isConnected, unsubscribe };
}

// Hook specifically for project stats real-time updates
export function useProjectRealtime(projectId: string, onUpdate: () => void) {
  const [isConnected, setIsConnected] = useState(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`project-${projectId}`)
      // Listen for code_batches changes
      .on(
        "postgres_changes" as const,
        {
          event: "*",
          schema: "public",
          table: "code_batches",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          onUpdateRef.current();
        }
      )
      // Listen for codes changes (redemptions)
      .on(
        "postgres_changes" as const,
        {
          event: "UPDATE",
          schema: "public",
          table: "codes",
        },
        (payload) => {
          if (payload.new && (payload.new as { is_used?: boolean }).is_used) {
            onUpdateRef.current();
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      channel.unsubscribe();
    };
  }, [projectId]);

  return { isConnected };
}

// Hook for dashboard-wide real-time updates
export function useDashboardRealtime(developerId: string, onUpdate: () => void) {
  const [isConnected, setIsConnected] = useState(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`dashboard-${developerId}`)
      .on(
        "postgres_changes" as const,
        {
          event: "*",
          schema: "public",
          table: "code_batches",
        },
        () => {
          onUpdateRef.current();
        }
      )
      .on(
        "postgres_changes" as const,
        {
          event: "*",
          schema: "public",
          table: "projects",
        },
        () => {
          onUpdateRef.current();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      channel.unsubscribe();
    };
  }, [developerId]);

  return { isConnected };
}
