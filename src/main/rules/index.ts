export interface Rule {
  match(command: string, errorOutput: string): boolean;
  fix(command: string, errorOutput: string): string;
}

import { sudoRule } from './sudo';
import { gitTypoRule } from './gitTypo';
import { cdNotADirRule } from './cdNotADir';
import { wrongFlagRule } from './wrongFlag';

const RULES: Rule[] = [
  sudoRule,
  gitTypoRule,
  cdNotADirRule,
  wrongFlagRule,
];

export function runRules(command: string, errorOutput: string): string | null {
  for (const rule of RULES) {
    if (rule.match(command, errorOutput)) {
      return rule.fix(command, errorOutput);
    }
  }
  return null;
}
