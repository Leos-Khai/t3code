import type { OrchestrationLatestTurnState } from "@t3tools/contracts";

export interface ChatActivitySnapshot {
  readonly threadKey: string;
  readonly isWorking: boolean;
  readonly turnId: string | null;
  readonly turnState: OrchestrationLatestTurnState | null;
  readonly approvalRequestId: string | null;
  readonly userInputRequestId: string | null;
}

const turnEndMessages = {
  completed: "Response complete",
  interrupted: "Response stopped",
  error: "Response failed",
} as const;

/**
 * Picks the screen reader announcement for a change in chat activity, or null
 * when nothing worth announcing changed. Only state transitions qualify, never
 * streamed content. Opening or switching threads announces nothing, since the
 * user did not witness the earlier state.
 */
export function deriveChatActivityAnnouncement(
  previous: ChatActivitySnapshot | null,
  next: ChatActivitySnapshot,
): string | null {
  if (previous === null || previous.threadKey !== next.threadKey) return null;
  if (next.approvalRequestId !== null && next.approvalRequestId !== previous.approvalRequestId) {
    return "Approval needed";
  }
  if (next.userInputRequestId !== null && next.userInputRequestId !== previous.userInputRequestId) {
    return "Question from agent";
  }
  // Turn end is read from the server's turn record rather than `isWorking`
  // falling, because `isWorking` also covers local send and compaction states
  // that can briefly drop between hand-offs.
  if (
    next.turnId !== null &&
    next.turnId === previous.turnId &&
    previous.turnState === "running" &&
    next.turnState !== null &&
    next.turnState !== "running"
  ) {
    return turnEndMessages[next.turnState];
  }
  if (next.isWorking && !previous.isWorking) return "Agent working";
  return null;
}
