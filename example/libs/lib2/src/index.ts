import { logger } from '@lib1';
import { testingLogger } from '@testing/logger';

export function lib2Logger() {
  return logger();
}

const test = testingLogger;
