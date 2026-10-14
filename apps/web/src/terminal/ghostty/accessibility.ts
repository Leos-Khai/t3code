// Escape sequences (CSI, OSC/DCS/SOS/PM/APC strings, plain ESC) and C0/C1
// controls other than tab, line feed and carriage return. Each terminator is
// captured so a sequence cut off at the end of a chunk can be told apart.
const CONTROL_SEQUENCE =
  // eslint-disable-next-line no-control-regex -- Matching control characters is the point.
  /\x1b(?:\[[0-?]*[ -/]*([@-~])?|[\]PX^_][\s\S]*?(\x07|\x1b\\|$)|[ -/]*([0-~])?)|[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g;
/** Output beyond this many lines between keystrokes is left for review instead of read aloud. */
const MAX_ANNOUNCED_LINES = 20;
const ANNOUNCE_DELAY_MS = 100;
const TOO_MUCH_OUTPUT = "\nToo much output to announce, read the terminal rows instead.";

/** Printable text of PTY output, plus an unfinished trailing sequence to prepend to the next chunk. */
export function stripTerminalControls(data: string): { text: string; pending: string } {
  let pending = "";
  const text = data.replace(
    CONTROL_SEQUENCE,
    (
      match: string,
      csiEnd: string | undefined,
      stringEnd: string | undefined,
      escEnd: string | undefined,
      offset: number,
    ) => {
      if (
        match.startsWith("\x1b") &&
        offset + match.length === data.length &&
        !(csiEnd || stringEnd || escEnd)
      ) {
        pending = match;
      }
      return "";
    },
  );
  return { text, pending };
}

/** Collapses carriage-return rewrites (progress bars, spinners) to the last visible text per line. */
export function collapseTerminalOverwrites(text: string): string {
  return text
    .replace(/\r+\n/g, "\n")
    .split("\n")
    .map((line) => line.split("\r").findLast(Boolean) ?? "")
    .join("\n");
}

/**
 * Screen reader live region for terminal output, following xterm.js: output is
 * read aloud in short batches, the shell's echo of typed characters is skipped
 * because the screen reader already spoke them, and long bursts stop being
 * read until the next keystroke.
 */
export class TerminalAnnouncer {
  readonly element: HTMLDivElement;
  private pending = "";
  private buffer = "";
  private echo: string[] = [];
  private lines = 0;
  private timer: number | null = null;

  constructor() {
    this.element = document.createElement("div");
    this.element.className = "sr-only";
    this.element.setAttribute("aria-live", "polite");
  }

  typed(data: string): void {
    this.element.textContent = "";
    this.lines = 0;
    // Control keys (Enter, arrows) produce output the screen reader has not spoken.
    if ([...data].length === 1 && data >= " " && data !== "\x7f") this.echo.push(data);
    else this.echo = [];
  }

  output(data: string): void {
    if (this.lines > MAX_ANNOUNCED_LINES) return;
    const { text, pending } = stripTerminalControls(this.pending + data);
    this.pending = pending;
    for (const char of text) {
      if (this.echo.shift() === char) continue;
      this.buffer += char;
      if (char === "\n" && ++this.lines > MAX_ANNOUNCED_LINES) {
        this.buffer += TOO_MUCH_OUTPUT;
        this.pending = "";
        break;
      }
    }
    if (this.buffer.length > 0 && this.timer === null) {
      this.timer = window.setTimeout(this.flush, ANNOUNCE_DELAY_MS);
    }
  }

  reset(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    this.pending = "";
    this.buffer = "";
    this.echo = [];
    this.lines = 0;
  }

  private readonly flush = () => {
    this.timer = null;
    const text = collapseTerminalOverwrites(this.buffer);
    this.buffer = "";
    if (text.trim().length > 0) this.element.textContent = text;
  };
}
