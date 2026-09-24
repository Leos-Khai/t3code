import type { OrchestrationLatestTurnState } from "@t3tools/contracts";

/** What a screen reader user should hear about the thread they are viewing. */
export interface ThreadActivityAnnouncementState {
  readonly threadKey: string;
  readonly connected: boolean;
  readonly environmentLabel: string | null;
  readonly working: boolean;
  readonly turnState: OrchestrationLatestTurnState | null;
  readonly approvalRequestId: string | null;
  readonly userInputRequestId: string | null;
}

/**
 * The status message for a change between two renders, or null when nothing
 * worth speaking changed. Opening or switching threads is silent: the screen
 * already shows that state, and only later changes are news.
 */
export function threadActivityAnnouncement(
  previous: ThreadActivityAnnouncementState | null,
  next: ThreadActivityAnnouncementState,
): string | null {
  if (previous === null || previous.threadKey !== next.threadKey) return null;

  const messages: string[] = [];
  const environmentLabel = next.environmentLabel ?? "environment";
  if (previous.connected && !next.connected) {
    messages.push(`Disconnected from ${environmentLabel}`);
  } else if (!previous.connected && next.connected) {
    messages.push(`Connected to ${environmentLabel}`);
  }

  if (!previous.working && next.working) {
    messages.push("Agent working");
  } else if (previous.working && !next.working) {
    messages.push(
      next.turnState === "error"
        ? "Response failed"
        : next.turnState === "interrupted"
          ? "Response stopped"
          : "Response complete",
    );
  }

  // Keyed on request id so a second request right after the first is still
  // announced, while re-renders of the same request are not.
  if (next.approvalRequestId !== null && next.approvalRequestId !== previous.approvalRequestId) {
    messages.push("Approval needed");
  }
  if (next.userInputRequestId !== null && next.userInputRequestId !== previous.userInputRequestId) {
    messages.push("Question from agent");
  }

  return messages.length > 0 ? messages.join(". ") : null;
}
