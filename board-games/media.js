const fs=require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'board-games.css');
const s=fs.readFileSync(filePath,'utf8');
const re=/@media[^\{]+\{/g;
let m,i=0;
while((m=re.exec(s)) && i<40){
  const line=s.slice(0,m.index).split(/\r?\n/).length;
  console.log(line+': '+m[0]);
  i++;
}
