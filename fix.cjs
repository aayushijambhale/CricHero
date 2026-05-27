const fs = require('fs');
const path = require('path');
const dir = 'e:/CricHero/src/backend/engines';

fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.ts')) {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');
    content = content.split('"../types"').join('"../../types"');
    fs.writeFileSync(p, content);
  }
});
console.log('done');
