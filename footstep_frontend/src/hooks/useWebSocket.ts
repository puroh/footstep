/**
 * WebSocket hook for the kitchen panel.
 * Connects with JWT token as query param, implements exponential backoff reconnection.
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface UseWebSocketOptions {
  url: string;
  token: string;
  onMessage: (data: unknown) => void;
  enabled?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  reconnectAttempt: number;
}

const INITIAL_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

function getBackoffDelay(attempt: number): number {
  return Math.min(Math.pow(2, attempt) * INITIAL_DELAY_MS, MAX_DELAY_MS);
}

export function useWebSocket({
  url,
  token,
  onMessage,
  enabled = true,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMessageRef = useRef(onMessage);

  // Keep onMessage ref current without triggering reconnects
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!enabled || !token) return;

    const separator = url.includes("?") ? "&" : "?";
    const wsUrl = `${url}${separator}token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setReconnectAttempt(0);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessageRef.current(data);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      wsRef.current = null;

      // Don't reconnect if closed intentionally (4001 = auth failure)
      if (event.code === 4001) return;

      // Schedule reconnection with exponential backoff
      setReconnectAttempt((prev) => {
        const next = prev + 1;
        const delay = getBackoffDelay(next);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
        return next;
      });
    };

    ws.onerror = () => {
      // Error will trigger onclose
    };
  }, [url, token, enabled]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000);
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected, reconnectAttempt };
}
