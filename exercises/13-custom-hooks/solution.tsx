/**
 * Exercise 13: Custom Hooks as Synchronization Units — SOLUTION
 * ==============================================================
 */

import type { FunctionComponent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Fake WebSocket (same as exercise)
// ---------------------------------------------------------------------------

interface FakeWebSocket {
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  send: (data: string) => void;
  close: () => void;
  readyState: number;
}

const CONNECTING = 0;
const OPEN = 1;
const CLOSED = 3;

function createFakeWebSocket(url: string): FakeWebSocket {
  const ws: FakeWebSocket = {
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
    readyState: CONNECTING,
    send: (data: string) => {
      if (ws.readyState !== OPEN) return;
      setTimeout(() => {
        ws.onmessage?.({ data: `Echo: ${data}` });
      }, 200);
    },
    close: () => {
      ws.readyState = CLOSED;
      ws.onclose?.();
    },
  };

  setTimeout(() => {
    if (ws.readyState === CONNECTING) {
      if (Math.random() < 0.1) {
        ws.readyState = CLOSED;
        ws.onerror?.();
        ws.onclose?.();
      } else {
        ws.readyState = OPEN;
        ws.onopen?.();

        const interval = setInterval(() => {
          if (ws.readyState === OPEN) {
            ws.onmessage?.({ data: `Server time: ${new Date().toLocaleTimeString()}` });
          } else {
            clearInterval(interval);
          }
        }, 3000);
      }
    }
  }, 300);

  return ws;
}

// ---------------------------------------------------------------------------
// Solution: useWebSocket custom hook
//
// A complete synchronization unit — all setup, teardown, and reconnection
// encapsulated. Consumer gets a clean API with no lifecycle concerns.
// ---------------------------------------------------------------------------

type ConnectionStatus = "connecting" | "open" | "closed";

interface UseWebSocketResult {
  status: ConnectionStatus;
  lastMessage: string | null;
  send: (data: string) => void;
}

function useWebSocket(url: string): UseWebSocketResult {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  // Refs for values that drive reconnection logic but don't need to trigger re-renders
  const wsRef = useRef<FakeWebSocket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a ref to the latest send implementation so the stable wrapper stays stable.
  // We update sendImplRef on every render — ref mutations are synchronous and don't
  // cause re-renders, so the consumer's useCallback/useMemo deps stay clean.
  const sendImplRef = useRef<(data: string) => void>(() => {});
  sendImplRef.current = (data: string) => {
    if (wsRef.current?.readyState === OPEN) {
      wsRef.current.send(data);
    }
  };

  // Stable send — never changes identity, no stale closures
  const send = useCallback((data: string) => {
    sendImplRef.current(data);
  }, []);

  useEffect(() => {
    let destroyed = false;

    function connect() {
      if (destroyed) return;

      // Clean up any in-flight retry timer before opening a new connection
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      setStatus("connecting");
      const ws = createFakeWebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (destroyed) return;
        setStatus("open");
        retryCountRef.current = 0; // Reset backoff counter on successful connection
      };

      ws.onmessage = (event) => {
        if (destroyed) return;
        setLastMessage(event.data);
      };

      ws.onerror = () => {
        // onerror is always followed by onclose in the browser WebSocket spec,
        // so we let onclose handle the reconnect logic.
      };

      ws.onclose = () => {
        if (destroyed) return;
        setStatus("closed");

        // Reconnect with exponential backoff — capped at 30 s
        const delay = Math.min(1000 * 2 ** retryCountRef.current, 30000);
        retryCountRef.current += 1;
        retryTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    }

    connect();

    return () => {
      // Mark as destroyed first so in-flight callbacks don't schedule reconnects
      destroyed = true;

      // Null out onclose BEFORE calling close() — otherwise ws.close() would
      // fire our onclose handler and schedule a reconnect during cleanup.
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [url]); // Re-run only when the URL changes — everything else lives in refs

  return { status, lastMessage, send };
}

// ---------------------------------------------------------------------------
// Solution: Clean consumer component
// ---------------------------------------------------------------------------

export const LiveFeed: FunctionComponent = () => {
  const { status, lastMessage, send } = useWebSocket("wss://fake.example.com/feed");
  const [messages, setMessages] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");

  // Track full message history in the component — the hook exposes only lastMessage
  useEffect(() => {
    if (lastMessage) {
      setMessages((prev) => [...prev.slice(-49), lastMessage]);
    }
  }, [lastMessage]);

  const handleSend = () => {
    if (inputValue) {
      send(inputValue);
      setInputValue("");
    }
  };

  return (
    <div>
      <h1>Live Feed</h1>
      <div>
        Status: <strong>{status}</strong>
      </div>

      <div style={{ marginTop: 8 }}>
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Send a message..."
          disabled={status !== "open"}
        />
        <button onClick={handleSend} disabled={status !== "open"}>
          Send
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Messages ({messages.length})</h3>
        <div style={{ maxHeight: 300, overflow: "auto", border: "1px solid #ddd", padding: 8 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ padding: "2px 0", borderBottom: "1px solid #eee" }}>
              {msg}
            </div>
          ))}
          {messages.length === 0 && <div style={{ color: "#999" }}>No messages yet</div>}
        </div>
      </div>
    </div>
  );
};

/**
 * Key patterns demonstrated:
 *
 * 1. Single effect for the full lifecycle
 *    The exercise had two effects — one for connect and one for reconnection.
 *    That split caused a cascade: closing set state, which triggered the second
 *    effect, which set more state, which re-triggered the first effect.
 *    Solution: schedule reconnect from INSIDE onclose, same effect, no cascade.
 *
 * 2. Refs for non-rendering state
 *    retryCountRef: backoff counter (no re-render needed when it changes)
 *    retryTimeoutRef: timer handle for cleanup (not UI-relevant)
 *    wsRef: the live socket instance (not UI-relevant)
 *    Only status and lastMessage are in React state — they are the only values
 *    that need to drive a re-render.
 *    Compare: useAuctionStateUpdater.ts uses the same ref-heavy approach.
 *
 * 3. Stable send via the ref-updated-on-render pattern
 *    sendImplRef.current is rewritten every render with the latest closure.
 *    The stable wrapper `send` (empty useCallback deps) always delegates to it.
 *    This means consumers can put `send` in dependency arrays without churn.
 *    Compare: spending.tsx refetchWithCurrentVariables reads refetchVariablesRef.
 *
 * 4. Null-out onclose before ws.close() during cleanup
 *    If you call ws.close() without first nulling onclose, the close handler
 *    fires synchronously and schedules a reconnect during React cleanup — which
 *    means a dangling timeout outlives the component.
 *    The `destroyed` flag provides a second line of defence for async callbacks
 *    (onopen, onmessage) that may fire after cleanup starts.
 *
 * Real codebase references:
 *   - domains/dutch-auction/src/auctionEvent/useAuctionStateUpdater.ts: full sync unit
 *   - segments/scroll/src/useScrollDirection.ts: singleton store pattern
 */
