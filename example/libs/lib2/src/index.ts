import { logger } from '@lib1';
import { testingLogger } from '@testing/logger';

export function lib2Logger() {
  return logger();
}

export function nestedLib2Logger() {
  console.log('Logging from nested directory in lib2');
}

export const test = testingLogger;
