import { webContents } from 'electron';
import { runRules } from './rules/index';

const ANSI_RE = /\x1b\[[0-9;]*[mGKHFABCDsuJrh]|\x1b[()][AB012]|\x1b[=>M]|\r/g;
const PROMPT_RE = /[$%❯>#]\s*$/m;
const ERROR_PATTERNS = [
  /command not found/i,
  /permission denied/i,
  /no such file or directory/i,
  /not a git command/i,
  /unknown option/i,
  /invalid flag/i,
  /not a directory/i,
];

interface CommandRecord {
  command: string;
  output: string;
}

export class CommandTracker {
  private inputBuffer = '';
  private pendingCommand: string | null = null;
  private outputBuffer = '';
  private history: CommandRecord[] = [];
  private consecutiveFailures = 0;

  constructor(
    private readonly terminalId: number,
    private readonly webContentsId: number,
  ) {}

  onInput(data: string): void {
    if (data === '\r' || data === '\n') {
      const cmd = this.inputBuffer.trim();
      if (cmd) {
        this.pendingCommand = cmd;
        this.outputBuffer = '';
      }
      this.inputBuffer = '';
    } else if (data === '\x7f') {
      this.inputBuffer = this.inputBuffer.slice(0, -1);
    } else if (data.length === 1 && data >= ' ') {
      this.inputBuffer += data;
    }
  }

  onOutput(data: string): void {
    if (this.pendingCommand === null) return;
    this.outputBuffer += data;

    const clean = this.outputBuffer.replace(ANSI_RE, '');
    if (!PROMPT_RE.test(clean)) return;

    const command = this.pendingCommand;
    const output = clean;
    this.pendingCommand = null;
    this.outputBuffer = '';

    const failed = ERROR_PATTERNS.some((p) => p.test(output));
    if (failed) {
      this.history.push({ command, output });
      if (this.history.length > 2) this.history.shift();
      this.consecutiveFailures++;
    } else {
      this.consecutiveFailures = 0;
      this.history = [];
    }

    if (this.consecutiveFailures >= 2) {
      this.consecutiveFailures = 0;
      this.sendSuggestion();
    }
  }

  reset(): void {
    this.inputBuffer = '';
    this.pendingCommand = null;
    this.outputBuffer = '';
    this.history = [];
    this.consecutiveFailures = 0;
  }

  private sendSuggestion(): void {
    const last = this.history[this.history.length - 1];
    if (!last) return;
    const corrected = runRules(last.command, last.output);
    const wc = webContents.fromId(this.webContentsId);
    if (wc && !wc.isDestroyed()) {
      wc.send('correction-suggestion', { terminalId: this.terminalId, corrected });
    }
  }
}
