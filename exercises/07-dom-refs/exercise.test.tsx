/**
 * Exercise 07 — the "Done when" lists as tests.
 *
 * `npm test` runs these in your browser against exercise.tsx. Once the
 * solution is released they run against solution.tsx too, so you can see what
 * green looks like. They check behaviour, not code: any fix that behaves
 * correctly passes. The constraints that are about code ("still as slow",
 * "doesn't need to know why the <div> comes and goes") are up to you.
 */

import { createRef, type FunctionComponent, type Ref, useState } from "react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

type Exercise07 = typeof import("./exercise");
type Screen = Awaited<ReturnType<typeof render>>;

// exercise.tsx always; solution.tsx only once it has been released.
const targets: Record<string, () => Promise<Exercise07>> = {
  "exercise.tsx": () => import("./exercise"),
  ...Object.fromEntries(
    Object.values(import.meta.glob<Exercise07>("./solution.tsx")).map((load) => [
      "solution.tsx",
      load,
    ]),
  ),
};

const button = (screen: Screen, name: string) =>
  screen.getByRole("button", { name }).element() as HTMLButtonElement;

/** Types into a controlled input one keystroke at a time. */
const typeInto = (input: HTMLInputElement, text: string) => {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  for (const char of text) {
    setValue.call(input, input.value + char);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
};

const waitMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

for (const [target, load] of Object.entries(targets)) {
  describe(target, () => {
    let mod: Exercise07;
    beforeAll(async () => {
      mod = await load();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe("A: FancyInput", () => {
      test("Focus puts the cursor in the input", async () => {
        const screen = await render(<mod.FancyInputDemo />);
        const input = screen.getByRole("textbox").element();
        expect(document.activeElement).not.toBe(input);

        button(screen, "Focus").click();

        expect(document.activeElement).toBe(input);
      });

      test("Clear empties the input and puts the cursor in it", async () => {
        const screen = await render(<mod.FancyInputDemo />);
        const input = screen.getByRole("textbox").element() as HTMLInputElement;
        typeInto(input, "hello");
        await expect.element(screen.getByRole("textbox")).toHaveValue("hello");
        input.blur();

        button(screen, "Clear").click();

        await expect.element(screen.getByRole("textbox"), { timeout: 1000 }).toHaveValue("");
        expect(document.activeElement).toBe(input);
      });

      test("the ref holds focus() and clear() and nothing else, not the <input>", async () => {
        // exercise.tsx's FancyInput doesn't declare a `ref` prop yet
        const FancyInput = mod.FancyInput as FunctionComponent<{ ref?: Ref<unknown> }>;
        const ref = createRef<unknown>();
        await render(<FancyInput ref={ref} />);

        expect(ref.current).not.toBeInstanceOf(Element);
        expect(Object.keys(ref.current ?? {}).sort()).toEqual(["clear", "focus"]);
      });

      test("FancyInput keeps its own value", async () => {
        const screen = await render(<mod.FancyInput />);
        typeInto(screen.getByRole("textbox").element() as HTMLInputElement, "abc");

        await expect.element(screen.getByRole("textbox")).toHaveValue("abc");
      });
    });

    describe("B: Scroll-Safe Input", () => {
      const Quantity = () => {
        const [quantity, setQuantity] = useState(2);
        return <mod.ScrollSafeInput value={quantity} onChange={setQuantity} />;
      };

      const openEditor = async (screen: Screen) => {
        button(screen, "Edit").click();
        await expect.element(screen.getByRole("spinbutton")).toBeInTheDocument();
        return screen.getByRole("spinbutton").element() as HTMLInputElement;
      };

      const closeEditor = async (screen: Screen) => {
        button(screen, "Done").click();
        await expect.element(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
      };

      /**
       * Scrolls over the input. Changing the number is the browser's default
       * action for the wheel event, so it doesn't change if and only if the
       * event's default was prevented.
       */
      const wheelChangesNumber = (input: HTMLInputElement) => {
        input.focus();
        const wheel = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 });
        input.dispatchEvent(wheel);
        return !wheel.defaultPrevented;
      };

      test("scrolling over the focused input doesn't change the number", async () => {
        const screen = await render(<Quantity />);
        const input = await openEditor(screen);

        expect(wheelChangesNumber(input)).toBe(false);
      });

      test("…however often you open and close the editor", async () => {
        const screen = await render(<Quantity />);

        for (let round = 1; round <= 3; round++) {
          const input = await openEditor(screen);
          expect(wheelChangesNumber(input), `round ${round}`).toBe(false);
          await closeEditor(screen);
        }
      });

      test("closing the editor leaves no wheel listener behind", async () => {
        const screen = await render(<Quantity />);
        const added = vi.spyOn(EventTarget.prototype, "addEventListener");
        const removed = vi.spyOn(EventTarget.prototype, "removeEventListener");
        const wheelCalls = (spy: typeof added) =>
          spy.mock.calls.filter(([type]) => type === "wheel").length;

        for (let round = 1; round <= 3; round++) {
          await openEditor(screen);
          await closeEditor(screen);
        }

        expect(wheelCalls(added) - wheelCalls(removed)).toBe(0);
      });
    });

    describe("C (optional): Hint Bubble", () => {
      const SHORT_HINT = "Ships tomorrow.";
      const LONG_HINT =
        "Free returns within 30 days. Bring it to any store, or send it back " +
        "with the label in the box. Refunds take three to five working days.";

      /**
       * Hovers the button and records where the bubble is every time the DOM
       * changes, until it has had time for two slow renders. A MutationObserver
       * callback runs once the task that changed the DOM is over, right where
       * the browser may paint, so each entry is a position you could have seen.
       */
      const hoverAndWatch = async (target: HTMLButtonElement) => {
        const seen: DOMRect[] = [];
        const observer = new MutationObserver(() => {
          const bubble = document.querySelector('[role="tooltip"]');
          if (bubble) seen.push(bubble.getBoundingClientRect());
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true });

        target.dispatchEvent(
          new MouseEvent("mouseover", { bubbles: true, relatedTarget: document.body }),
        );
        await waitMs(600);
        observer.disconnect();

        const bubble = document.querySelector('[role="tooltip"]');
        expect(bubble, "no bubble after hovering").not.toBeNull();
        return { final: bubble!.getBoundingClientRect(), seen };
      };

      const unhover = (target: HTMLButtonElement) =>
        target.dispatchEvent(
          new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }),
        );

      /** Within a pixel: offsetHeight is rounded, the bounding rect isn't. */
      const expectNear = (actual: number, expected: number, what: string) =>
        expect(
          Math.abs(actual - expected),
          `${what}: ${actual}, expected ${expected}`,
        ).toBeLessThanOrEqual(1);

      test("sits just above the button, for a short hint and a long one", async () => {
        const screen = await render(
          <div style={{ paddingTop: 300 }}>
            <mod.HintButton label="Delivery" hint={SHORT_HINT} />
            <mod.HintButton label="Returns" hint={LONG_HINT} />
          </div>,
        );

        for (const name of ["Delivery", "Returns"]) {
          const target = button(screen, name);
          const { final } = await hoverAndWatch(target);
          expectNear(
            final.bottom,
            target.getBoundingClientRect().top - 8,
            `${name}: bubble bottom`,
          );
          unhover(target);
          await waitMs(50);
        }
      });

      test("sits just below the button when there isn't room above it", async () => {
        // 20px above the button: room for the gap, not for the bubble
        const screen = await render(
          <div style={{ paddingTop: 20 }}>
            <mod.HintButton label="Returns" hint={LONG_HINT} />
          </div>,
        );
        const target = button(screen, "Returns");

        const { final } = await hoverAndWatch(target);

        expectNear(final.top, target.getBoundingClientRect().bottom + 8, "bubble top");
      });

      test("is never seen anywhere else, not even for a moment", async () => {
        const screen = await render(
          <div style={{ paddingTop: 300 }}>
            <mod.HintButton label="Returns" hint={LONG_HINT} />
          </div>,
        );
        const target = button(screen, "Returns");

        const { seen } = await hoverAndWatch(target);

        expect(seen.length).toBeGreaterThan(0);
        for (const [i, rect] of seen.entries()) {
          expectNear(
            rect.bottom,
            target.getBoundingClientRect().top - 8,
            `bubble bottom, update ${i + 1}`,
          );
        }
      });
    });
  });
}
