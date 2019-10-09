import { lib2Logger } from '@lib2';
import { internalLogger } from '@internal';
import { internal2Logger } from '@internal2';
import { testingLogger } from '@testing/logger';

console.log('');
console.log('##########################');
console.log('# ------- APP 1 -------- #');
console.log('##########################');
console.log('');

lib2Logger();

internalLogger();

internal2Logger();

testingLogger();
