
const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// InputScreen Header
code = code.replace(/{calYear}年 {calMonth}月/g, '<span>{\${calYear}年 月\}</span>');
// InputScreen List Title
code = code.replace(/{calYear}年 {calMonth}月の記録/g, '<span>{\${calYear}年 月の記録\}</span>');

// ReportScreen Header & Summary
code = code.replace(/{period === 'month' \? \\年 \月\ : \\年\}/g, 
  '<span>{period === \'month\' ? \\年 \月\ : \\年\}</span>');

// AssetScreen Header
code = code.replace(/{parseInt\(y, 10\)}年 {parseInt\(m, 10\)}月末の資産/g, '<span>{\${parseInt(y, 10)}年 月末の資産\}</span>');

// AssetScreen Chart Title
code = code.replace(/{targetYear}年の推移/g, '<span>{\${targetYear}年の推移\}</span>');

fs.writeFileSync('src/App.jsx', code);
console.log('Done');

