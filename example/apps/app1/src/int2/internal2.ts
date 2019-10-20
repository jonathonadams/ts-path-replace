import { nestedLib2Logger } from '@lib2';

export const logger2 = nestedLib2Logger;

export function internal2Logger() {
  console.log('Logging from nested internal reference');
}
