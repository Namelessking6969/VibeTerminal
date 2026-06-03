import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  webContents: {
    fromId: vi.fn(() => ({
      isDestroyed: () => false,
      send: vi.fn(),
    })),
  },
}));

import { webContents } from 'electron';
import { CommandTracker } from '../src/main/commandTracker';

const ERROR_OUTPUT = 'bash: foo: command not found\r\n$ ';

function typeCommand(tracker: CommandTracker, cmd: string): void {
  for (const ch of cmd) tracker.onInput(ch);
  tracker.onInput('\r');
}

describe('CommandTracker', () => {
  let mockWc: { send: ReturnType<typeof vi.fn>; isDestroyed: () => boolean };

  beforeEach(() => {
    mockWc = { send: vi.fn(), isDestroyed: () => false };
    vi.mocked(webContents.fromId).mockReturnValue(mockWc as never);
  });

  it('does not send a suggestion after one failure', () => {
    const tracker = new CommandTracker(1, 1);
    typeCommand(tracker, 'foo');
    tracker.onOutput(ERROR_OUTPUT);
    expect(mockWc.send).not.toHaveBeenCalled();
  });

  it('sends correction-suggestion after two consecutive failures', () => {
    const tracker = new CommandTracker(1, 1);
    typeCommand(tracker, 'foo');
    tracker.onOutput(ERROR_OUTPUT);
    typeCommand(tracker, 'foo');
    tracker.onOutput(ERROR_OUTPUT);
    expect(mockWc.send).toHaveBeenCalledWith('correction-suggestion', {
      terminalId: 1,
      corrected: null,
    });
  });

  it('resets consecutive failure count after a successful command', () => {
    const tracker = new CommandTracker(1, 1);
    typeCommand(tracker, 'foo');
    tracker.onOutput(ERROR_OUTPUT);
    typeCommand(tracker, 'ls');
    tracker.onOutput('file.txt\r\n$ ');
    typeCommand(tracker, 'foo');
    tracker.onOutput(ERROR_OUTPUT);
    expect(mockWc.send).not.toHaveBeenCalled();
  });

  it('sends the corrected command for a sudo fix', () => {
    const tracker = new CommandTracker(1, 1);
    typeCommand(tracker, 'cp file /etc/hosts');
    tracker.onOutput('cp: /etc/hosts: Permission denied\r\n$ ');
    typeCommand(tracker, 'cp file /etc/hosts');
    tracker.onOutput('cp: /etc/hosts: Permission denied\r\n$ ');
    expect(mockWc.send).toHaveBeenCalledWith('correction-suggestion', {
      terminalId: 1,
      corrected: 'sudo cp file /etc/hosts',
    });
  });

  it('reset() clears all state', () => {
    const tracker = new CommandTracker(1, 1);
    typeCommand(tracker, 'foo');
    tracker.onOutput(ERROR_OUTPUT);
    tracker.reset();
    typeCommand(tracker, 'foo');
    tracker.onOutput(ERROR_OUTPUT);
    expect(mockWc.send).not.toHaveBeenCalled();
  });
});
