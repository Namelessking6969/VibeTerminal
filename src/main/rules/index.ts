export interface Rule {
  match(command: string, errorOutput: string): boolean;
  fix(command: string, errorOutput: string): string;
}

import { sudoRule } from './sudo';

const RULES: Rule[] = [
  sudoRule,
];

export function runRules(command: string, errorOutput: string): string | null {
  for (const rule of RULES) {
    if (rule.match(command, errorOutput)) {
      return rule.fix(command, errorOutput);
    }
  }
  return null;
}
