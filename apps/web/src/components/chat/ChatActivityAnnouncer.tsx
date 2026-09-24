import {
  activityAnnouncementMessages,
  type ActivityAnnouncementState,
} from "@t3tools/client-runtime/activity-announcement";
import { useEffect, useRef, useState } from "react";

/**
 * Hidden status region that tells screen reader users when the agent starts,
 * finishes, or needs them. Kept as its own component so an announcement
 * re-renders only this node, not ChatView.
 */
export function ChatActivityAnnouncer(props: ActivityAnnouncementState) {
  const {
    threadKey,
    working,
    turnId,
    turnState,
    turnRequestedAt,
    approvalRequestId,
    userInputRequestId,
  } = props;
  const previousRef = useRef<ActivityAnnouncementState | null>(null);
  const [announcement, setAnnouncement] = useState<{ message: string; id: number } | null>(null);

  useEffect(() => {
    const next = {
      threadKey,
      working,
      turnId,
      turnState,
      turnRequestedAt,
      approvalRequestId,
      userInputRequestId,
    };
    const previous = previousRef.current;
    previousRef.current = next;
    const messages = activityAnnouncementMessages(previous, next);
    if (messages.length > 0) {
      const message = messages.join(". ");
      setAnnouncement((current) => ({ message, id: (current?.id ?? 0) + 1 }));
    } else if (previous !== null && previous.threadKey !== threadKey) {
      // Drop the last thread's message so it can't be read out on this one.
      setAnnouncement(null);
    }
  }, [
    threadKey,
    working,
    turnId,
    turnState,
    turnRequestedAt,
    approvalRequestId,
    userInputRequestId,
  ]);

  return (
    <div role="status" aria-atomic="true" className="sr-only">
      {/* A fresh node per announcement makes screen readers repeat identical
          text, such as two approvals in a row. */}
      {announcement ? <span key={announcement.id}>{announcement.message}</span> : null}
    </div>
  );
}
