import type { Rule } from './index';

const BAD_FLAG_RE = /(?:unknown option|invalid flag)[:\s']+(-{1,2}[\w-]+)/i;

export const wrongFlagRule: Rule = {
  match(_command: string, errorOutput: string): boolean {
    return BAD_FLAG_RE.test(errorOutput);
  },
  fix(command: string, errorOutput: string): string {
    const m = errorOutput.match(BAD_FLAG_RE);
    if (!m) return command;
    const badFlag = m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return command.replace(new RegExp(`\\s+${badFlag}(?=\\s|$)`), '').trim();
  },
};
