/**
 * Exercise 13: Custom Hooks as Synchronization Units
 * =====================================================
 *
 * Mental model: A custom hook wraps and owns a piece of reactive synchronization.
 * It encapsulates setup, teardown, and state management into a reusable unit.
 *
 * FORMAT: Build from scratch
 * You are given: the FakeWebSocket, the hook interface, and the consumer component.
 * You implement: useWebSocket — a custom hook that manages the full WebSocket lifecycle.
 */

import type { FunctionComponent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// PROVIDED: Fake WebSocket (don't modify)
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
// Exercise: Implement useWebSocket
//
// Build a custom hook that manages the full WebSocket lifecycle.
//
// Interface:
//   function useWebSocket(url: string): {
//     status: "connecting" | "open" | "closed";
//     lastMessage: string | null;
//     send: (data: string) => void;
//   }
//
// Requirements:
//   1. Single effect for connect/disconnect lifecycle
//      - Call createFakeWebSocket(url) to connect
//      - Set up onopen, onmessage, onerror, onclose handlers
//      - Clean up on unmount (close the socket)
//
//   2. Reconnection with exponential backoff on error/close
//      - When onclose fires, schedule a reconnect after a delay
//      - Delay = min(1000 * 2^retryCount, 30000) — exponential, capped at 30s
//      - Reset retry count on successful connection
//      - IMPORTANT: use a ref for retryCount, not state (why?)
//
//   3. Stable `send` function
//      - `send` should not change identity across renders
//      - Use the "ref-updated-on-render" pattern:
//        a. Create a ref (sendImplRef) that holds the latest send implementation
//        b. Update sendImplRef.current on every render with the latest closure
//        c. Return a stable wrapper (useCallback with [] deps) that delegates to sendImplRef
//
//   4. Clean cleanup
//      - When the effect cleans up (unmount or url change), don't reconnect
//      - Null out ws.onclose BEFORE calling ws.close() — otherwise close()
//        fires onclose synchronously, which schedules a reconnect during cleanup
//      - Use a `destroyed` flag to prevent async callbacks from firing after cleanup
//
// Hints:
//   - Only `status` and `lastMessage` should be React state (they drive renders)
//   - wsRef, retryCountRef, retryTimeoutRef should all be refs (no re-renders)
//   - Define a `connect()` function INSIDE the effect, call it immediately,
//     and call it again from onclose for reconnection
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

  // TODO: implement the hook
  // Hints:
  //   const wsRef = useRef<FakeWebSocket | null>(null);
  //   const retryCountRef = useRef(0);
  //   const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  //   const sendImplRef = useRef<(data: string) => void>(() => {});

  const send = useCallback((_data: string) => {
    // TODO: delegate to sendImplRef.current
  }, []);

  return { status, lastMessage, send };
}

// ---------------------------------------------------------------------------
// PROVIDED: Consumer component (don't modify)
//
// This component uses your hook. It tracks message history locally
// and provides a send input. The hook only needs to expose status,
// lastMessage, and send.
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
