import { useEffect, useRef, useState } from "react";

import {
  deriveChatActivityAnnouncement,
  type ChatActivitySnapshot,
} from "./ChatActivityAnnouncer.logic";

/**
 * Hidden status region that tells screen reader users when the agent starts,
 * finishes, or needs them. Kept as its own component so an announcement
 * re-renders only this node, not ChatView.
 */
export function ChatActivityAnnouncer(props: ChatActivitySnapshot) {
  const { threadKey, isWorking, turnId, turnState, approvalRequestId, userInputRequestId } = props;
  const previousRef = useRef<ChatActivitySnapshot | null>(null);
  const [announcement, setAnnouncement] = useState<{ message: string; id: number } | null>(null);

  useEffect(() => {
    const next = { threadKey, isWorking, turnId, turnState, approvalRequestId, userInputRequestId };
    const previous = previousRef.current;
    previousRef.current = next;
    const message = deriveChatActivityAnnouncement(previous, next);
    if (message !== null) {
      setAnnouncement((current) => ({ message, id: (current?.id ?? 0) + 1 }));
    } else if (previous !== null && previous.threadKey !== threadKey) {
      // Drop the last thread's message so it can't be read out on this one.
      setAnnouncement(null);
    }
  }, [threadKey, isWorking, turnId, turnState, approvalRequestId, userInputRequestId]);

  return (
    <div role="status" aria-atomic="true" className="sr-only">
      {/* A fresh node per announcement makes screen readers repeat identical
          text, such as two approvals in a row. */}
      {announcement ? <span key={announcement.id}>{announcement.message}</span> : null}
    </div>
  );
}
