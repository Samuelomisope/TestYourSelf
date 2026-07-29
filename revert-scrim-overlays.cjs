const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const pattern = /bg-ink\/(\d+)/g;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(full);
    } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf8');
      const next = content.replace(pattern, 'bg-black/$1');
      if (next !== content) {
        fs.writeFileSync(full, next, 'utf8');
        console.log('Reverted:', full);
      }
    }
  }
}

walk(SRC_DIR);
console.log('Done.');
