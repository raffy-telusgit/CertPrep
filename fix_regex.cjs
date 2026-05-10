const fs = require('fs');
let content = fs.readFileSync('tests/phase1.spec.ts', 'utf8');

// Fix line 137 timer regex: /^d+:d{2}(:d{2})?$/ -> /^\d+:\d{2}(:\d{2})?$/
const old1 = 'expect(timerText).toMatch(/^d+:d{2}(:d{2})?$/)';
const new1 = 'expect(timerText).toMatch(/^\d+:\d{2}(:\d{2})?$/)';
content = content.replace(old1, new1);

// Fix line 395 score regex: /^d+%$/ -> /^\d+%$/
const old3 = 'expect(text).toMatch(/^d+%$/)';
const new3 = 'expect(text).toMatch(/^\d+%$/)';
content = content.replace(old3, new3);

fs.writeFileSync('tests/phase1.spec.ts', content);

const lines = content.split('\n');
console.log('Line 136:', JSON.stringify(lines[136]));
console.log('Line 152:', JSON.stringify(lines[152]));
console.log('Line 394:', JSON.stringify(lines[394]));
