"use client";

import {
  Component,
  Suspense,
  lazy,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { AssistantOperationalMode } from "@/lib/assistant/types";
import { AssistantIcon } from "./assistant-icon";

const LazyAssistantDrawer = lazy(() =>
  import("./assistant-drawer").then((m) => ({
    default: m.AssistantDrawer,
  })),
);

class DrawerErrorBoundary extends Component<
  { children: ReactNode; onReset: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          role="status"
          data-assistant-ui
          className="border-border bg-surface text-text fixed right-4 bottom-20 z-50 max-w-xs rounded-sm border p-3 font-sans text-xs shadow-md print:hidden"
        >
          <p>Could not open the assistant drawer right now.</p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onReset();
            }}
            className="text-primary mt-2 min-h-11 font-medium underline"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const emptySubscribe = () => () => {};

/**
 * Hydrate-gated portfolio assistant trigger (D-33). Renders nothing on SSR or
 * without JS, and dynamically loads the drawer chunk only after first click.
 */
export function AssistantLauncher({
  initialMode,
}: {
  initialMode: AssistantOperationalMode;
}) {
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const launcherRef = useRef<HTMLButtonElement>(null);
  const [hasOpened, setHasOpened] = useState(false);
  const [open, setOpen] = useState(false);
  const [limitedUntil, setLimitedUntil] = useState(0);

  if (!hydrated || initialMode === "disabled") return null;

  function openDrawer() {
    setHasOpened(true);
    setOpen(true);
  }

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        data-assistant-ui
        onClick={openDrawer}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Ask about Collins's portfolio"
        style={{
          transform: "translateY(calc(-1 * var(--evidence-strip-h, 0px)))",
        }}
        className="assistant-launcher-btn border-border bg-surface text-text hover:border-primary/60 fixed right-4 bottom-4 z-40 inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center gap-2 rounded-[6px] border px-2.5 shadow-[0_2px_10px_rgba(20,24,26,0.08)] transition-transform duration-200 xl:right-8 xl:bottom-6 xl:px-3.5 print:hidden"
      >
        <AssistantIcon size={28} />
        <span className="hidden lg:inline">Ask</span>
      </button>

      {hasOpened && (
        <DrawerErrorBoundary onReset={() => setHasOpened(false)}>
          <Suspense fallback={null}>
            <LazyAssistantDrawer
              open={open}
              onClose={() => setOpen(false)}
              initialMode={initialMode}
              launcherRef={launcherRef}
              limitedUntil={limitedUntil}
              onLimited={setLimitedUntil}
            />
          </Suspense>
        </DrawerErrorBoundary>
      )}
    </>
  );
}
