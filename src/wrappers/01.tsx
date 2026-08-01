import { useState, useRef } from "react";
import {
  createSnippet1,
  createSnippet2,
  createSnippet3,
  createSnippet4,
} from "../../exercises/01-closures-and-references/exercise.tsx";
import { ReferenceEqualityExercise } from "../../exercises/01-closures-and-references/referenceEquality.tsx";

const ClosuresExercise = () => {
  const [results, setResults] = useState<string[]>([]);
  const resultsRef = useRef<string[]>([]);

  // Capture console.log output for display
  const runWithCapture = (label: string, fn: () => void) => {
    const captured: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => {
      captured.push(args.map(String).join(" "));
      origLog(...args);
    };
    try {
      fn();
    } finally {
      console.log = origLog;
    }
    resultsRef.current = [...resultsRef.current, `--- ${label} ---`, ...captured];
    setResults([...resultsRef.current]);
  };

  // For snippet 4, we need to handle the async timeout
  const runSnippet4 = () => {
    const captured: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => {
      captured.push(args.map(String).join(" "));
      origLog(...args);
    };

    createSnippet4();

    // Wait for the timeout to fire
    setTimeout(() => {
      console.log = origLog;
      resultsRef.current = [
        ...resultsRef.current,
        "--- Snippet 4: setTimeout snapshot ---",
        ...captured,
      ];
      setResults([...resultsRef.current]);
    }, 1200);
  };

  return (
    <div>
      <h2>A: Closures</h2>
      <p style={{ color: "#666", fontSize: 14 }}>
        Predict the output for each snippet, then click "Run" to verify.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <button
            onClick={() =>
              runWithCapture("Snippet 1: basic capture", () => {
                const log = createSnippet1();
                log();
              })
            }
          >
            Run Snippet 1
          </button>
          <p style={{ fontSize: 12, color: "#999" }}>
            What does log() print?
            <br />
            Hint: when is count actually read?
          </p>
        </div>

        <div>
          <button
            onClick={() =>
              runWithCapture("Snippet 2: var in loop", () => {
                const fns = createSnippet2();
                fns.forEach((fn) => fn());
              })
            }
          >
            Run Snippet 2
          </button>
          <p style={{ fontSize: 12, color: "#999" }}>
            What does each fn() print?
            <br />
            Hint: <code>var</code> is function-scoped.
          </p>
        </div>

        <div>
          <button
            onClick={() =>
              runWithCapture("Snippet 3: let in loop", () => {
                const fns = createSnippet3();
                fns.forEach((fn) => fn());
              })
            }
          >
            Run Snippet 3
          </button>
          <p style={{ fontSize: 12, color: "#999" }}>
            Same loop but with <code>let</code>.<br />
            What changes?
          </p>
        </div>

        <div>
          <button onClick={runSnippet4}>Run Snippet 4</button>
          <p style={{ fontSize: 12, color: "#999" }}>
            setTimeout fires after 1s.
            <br />
            Hint: is currentValue a const or let?
          </p>
        </div>
      </div>

      <div
        style={{
          background: "#1e1e1e",
          color: "#d4d4d4",
          padding: 16,
          borderRadius: 8,
          fontFamily: "monospace",
          fontSize: 13,
          minHeight: 100,
          whiteSpace: "pre-wrap",
        }}
      >
        {results.length === 0
          ? "// Output will appear here..."
          : results.map((line, i) => (
              <div key={i} style={{ color: line.startsWith("---") ? "#569cd6" : "#d4d4d4" }}>
                {line}
              </div>
            ))}
      </div>

      <button
        onClick={() => {
          resultsRef.current = [];
          setResults([]);
        }}
        style={{ marginTop: 8 }}
      >
        Clear output
      </button>
    </div>
  );
};

export default function Wrapper() {
  return (
    <>
      <ClosuresExercise />
      <hr style={{ margin: "24px 0" }} />
      <ReferenceEqualityExercise />
    </>
  );
}
