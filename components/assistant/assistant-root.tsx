import type { AssistantOperationalMode } from "@/lib/assistant/types";
import { AssistantLauncher } from "./assistant-launcher";

/**
 * Server boundary wrapper (D-33): mounts zero client code when the assistant
 * is disabled, and passes only the safe operational mode down to the client.
 */
export function AssistantRoot({ mode }: { mode: AssistantOperationalMode }) {
  if (mode === "disabled") return null;
  return <AssistantLauncher initialMode={mode} />;
}
