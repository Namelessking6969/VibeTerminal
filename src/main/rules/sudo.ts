import type { Rule } from './index';

export const sudoRule: Rule = {
  match(_command: string, errorOutput: string): boolean {
    return /permission denied/i.test(errorOutput);
  },
  fix(command: string): string {
    return `sudo ${command}`;
  },
};
