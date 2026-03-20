/**
 * Exercise 13: Custom Hooks as Synchronization Units
 * =====================================================
 *
 * Mental model: A custom hook wraps and owns a piece of reactive synchronization.
 * It encapsulates setup, teardown, and state management into a reusable unit.
 *
 * These are patterns found in our codebase.
 *
 * Exercise: Extract tangled WebSocket logic into a clean custom hook.
 */

import type { FunctionComponent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Fake WebSocket (read but don't modify)
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
      // Echo back after a delay
      setTimeout(() => {
        ws.onmessage?.({ data: `Echo: ${data}` });
      }, 200);
    },
    close: () => {
      ws.readyState = CLOSED;
      ws.onclose?.();
    },
  };

  // Simulate connection delay
  setTimeout(() => {
    if (ws.readyState === CONNECTING) {
      // 10% chance of failure
      if (Math.random() < 0.1) {
        ws.readyState = CLOSED;
        ws.onerror?.();
        ws.onclose?.();
      } else {
        ws.readyState = OPEN;
        ws.onopen?.();

        // Simulate periodic messages
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
// Exercise: Tangled WebSocket Component
//
// This component has ALL the WebSocket logic inline — multiple effects, multiple
// state variables, reconnection logic. It works, but it's unmaintainable and
// not reusable.
//
// TODO: Extract into a `useWebSocket(url)` hook that returns:
//   { status: "connecting" | "open" | "closed", lastMessage: string | null, send: (data: string) => void }
//
// Requirements:
//   1. Single effect for connect/disconnect lifecycle
//   2. `send` should be a stable function (use ref pattern)
//   3. Reconnection with exponential backoff on error
//   4. All cleanup handled internally — consumer just calls the hook
// ---------------------------------------------------------------------------

export const LiveFeed: FunctionComponent = () => {
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const wsRef = useRef<FakeWebSocket | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const url = "wss://fake.example.com/feed";

  // Effect 1: Connect/disconnect
  // Bug: retryCount in deps causes a reconnect cascade — every retry schedules
  // another reconnect, which triggers the effect again immediately.
  useEffect(() => {
    const ws = createFakeWebSocket(url);
    wsRef.current = ws;
    setStatus("connecting");

    ws.onopen = () => {
      setStatus("open");
      setRetryCount(0);
    };

    ws.onmessage = (event) => {
      setLastMessage(event.data);
      setMessages((prev) => [...prev.slice(-49), event.data]);
    };

    ws.onerror = () => {
      setStatus("closed");
    };

    ws.onclose = () => {
      setStatus("closed");
    };

    return () => {
      ws.close();
    };
  }, [url, retryCount]); // Bug: retryCount in deps causes reconnect cascade

  // Effect 2: Reconnection with backoff
  // Bug: this effect reads retryCount from state, causing a cascade with Effect 1
  useEffect(() => {
    if (status === "closed") {
      const delay = Math.min(1000 * 2 ** retryCount, 30000);
      retryTimeoutRef.current = setTimeout(() => {
        setRetryCount((c) => c + 1);
      }, delay);

      return () => {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
      };
    }
  }, [status, retryCount]);

  // Send function — not stable! Recreated every render.
  const handleSend = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === OPEN && inputValue) {
      wsRef.current.send(inputValue);
      setInputValue("");
    }
  }, [inputValue]);

  return (
    <div>
      <h1>Live Feed</h1>
      <div>
        Status: <strong>{status}</strong>
        {status === "closed" && ` (retry #${retryCount})`}
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

      <div style={{ marginTop: 8, color: "#999", fontSize: 12 }}>
        Last message: {lastMessage ?? "none"}
      </div>
    </div>
  );
};

/**
 * Hints (try without these first):
 *
 * 1. Single effect: schedule reconnection from INSIDE onclose, not a separate effect.
 * 2. Stable send: a ref that holds the latest send implementation + a stable wrapper.
 * 3. Backoff: increment a ref (not state) to avoid triggering re-renders.
 * 4. Cleanup: prevent onclose from firing reconnection when YOU close intentionally.
 */
