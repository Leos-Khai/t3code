import { describe, expect, it } from "vite-plus/test";

import {
  deriveChatActivityAnnouncement,
  type ChatActivitySnapshot,
} from "./ChatActivityAnnouncer.logic";

const idle: ChatActivitySnapshot = {
  threadKey: "env:thread-1",
  isWorking: false,
  turnId: "turn-1",
  turnState: "completed",
  approvalRequestId: null,
  userInputRequestId: null,
};
const running: ChatActivitySnapshot = {
  ...idle,
  isWorking: true,
  turnId: "turn-2",
  turnState: "running",
};

describe("deriveChatActivityAnnouncement", () => {
  it("stays silent on first render and on thread switches", () => {
    expect(deriveChatActivityAnnouncement(null, running)).toBeNull();
    expect(
      deriveChatActivityAnnouncement(idle, { ...running, threadKey: "env:thread-2" }),
    ).toBeNull();
  });

  it("announces when the agent starts working", () => {
    expect(deriveChatActivityAnnouncement(idle, { ...idle, isWorking: true })).toBe(
      "Agent working",
    );
    expect(deriveChatActivityAnnouncement(running, running)).toBeNull();
  });

  it("announces how the running turn ended", () => {
    const ended = (turnState: ChatActivitySnapshot["turnState"]) =>
      deriveChatActivityAnnouncement(running, { ...running, isWorking: false, turnState });
    expect(ended("completed")).toBe("Response complete");
    expect(ended("interrupted")).toBe("Response stopped");
    expect(ended("error")).toBe("Response failed");
  });

  it("does not treat a loaded, already finished turn as an ending", () => {
    expect(
      deriveChatActivityAnnouncement({ ...idle, turnId: null, turnState: null }, idle),
    ).toBeNull();
  });

  it("announces each new approval or question once", () => {
    const approval = { ...running, approvalRequestId: "approval-1" };
    expect(deriveChatActivityAnnouncement(running, approval)).toBe("Approval needed");
    expect(deriveChatActivityAnnouncement(approval, approval)).toBeNull();
    const question = { ...running, userInputRequestId: "input-1" };
    expect(deriveChatActivityAnnouncement(running, question)).toBe("Question from agent");
    expect(deriveChatActivityAnnouncement(question, { ...question })).toBeNull();
  });
});
