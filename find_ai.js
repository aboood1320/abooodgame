const fs=require('fs');
const s=fs.readFileSync('chess/ai.js','utf8');
const idx = s.indexOf('LEVEL');
if(idx >=0) {
  const end = s.indexOf('\n}', idx);
  console.log(s.substring(idx, Math.min(idx+400, end+50)));
}
