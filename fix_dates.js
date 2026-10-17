
const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

code = code.replace(/new Date\(b\.date\)/g, 'parseSafeDate(b.date)');
code = code.replace(/new Date\(a\.date\)/g, 'parseSafeDate(a.date)');
code = code.replace(/const calDate = new Date\(date\);/g, 'const calDate = parseSafeDate(date);');
code = code.replace(/const dateObj = new Date\(tx\.date\);/g, 'const dateObj = parseSafeDate(tx.date);');
code = code.replace(/const d = new Date\(date\);/g, 'const d = parseSafeDate(date);');
code = code.replace(/const d = new Date\(monthStr\);/g, 'const d = parseSafeDate(monthStr);');

fs.writeFileSync('src/App.jsx', code);
console.log('Done');

