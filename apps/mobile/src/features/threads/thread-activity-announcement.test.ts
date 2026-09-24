import { describe, expect, it } from "vite-plus/test";

import {
  threadActivityAnnouncement,
  type ThreadActivityAnnouncementState,
} from "./thread-activity-announcement";

const idle: ThreadActivityAnnouncementState = {
  threadKey: "env:thread-1",
  connected: true,
  environmentLabel: "Mac mini",
  working: false,
  turnState: "completed",
  approvalRequestId: null,
  userInputRequestId: null,
};
const working = { ...idle, working: true, turnState: "running" } as const;

describe("threadActivityAnnouncement", () => {
  it("stays silent when a thread opens or the selection switches threads", () => {
    expect(threadActivityAnnouncement(null, working)).toBeNull();
    expect(threadActivityAnnouncement(idle, { ...working, threadKey: "env:thread-2" })).toBeNull();
  });

  it("stays silent when nothing it reports changed", () => {
    expect(threadActivityAnnouncement(working, { ...working })).toBeNull();
  });

  it("announces a turn starting and how it ended", () => {
    expect(threadActivityAnnouncement(idle, working)).toBe("Agent working");
    expect(threadActivityAnnouncement(working, idle)).toBe("Response complete");
    expect(threadActivityAnnouncement(working, { ...idle, turnState: "interrupted" })).toBe(
      "Response stopped",
    );
    expect(threadActivityAnnouncement(working, { ...idle, turnState: "error" })).toBe(
      "Response failed",
    );
  });

  it("announces each new approval and question once", () => {
    const approval = { ...working, approvalRequestId: "approval-1" };
    expect(threadActivityAnnouncement(working, approval)).toBe("Approval needed");
    expect(threadActivityAnnouncement(approval, { ...approval })).toBeNull();
    expect(
      threadActivityAnnouncement(approval, { ...working, approvalRequestId: "approval-2" }),
    ).toBe("Approval needed");

    const question = { ...working, userInputRequestId: "question-1" };
    expect(threadActivityAnnouncement(working, question)).toBe("Question from agent");
    expect(threadActivityAnnouncement(question, working)).toBeNull();
  });

  it("announces the connection only when it crosses connected", () => {
    const disconnected = { ...idle, connected: false };
    expect(threadActivityAnnouncement(idle, disconnected)).toBe("Disconnected from Mac mini");
    expect(threadActivityAnnouncement(disconnected, { ...disconnected })).toBeNull();
    expect(threadActivityAnnouncement(disconnected, idle)).toBe("Connected to Mac mini");
  });

  it("combines changes that land in the same render into one message", () => {
    expect(threadActivityAnnouncement({ ...working, connected: false }, idle)).toBe(
      "Connected to Mac mini. Response complete",
    );
  });
});
