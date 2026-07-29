const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');

const replacements = [
  [/bg-\[#0a0a0f\]\/(\d+)/g, 'bg-bg/$1'],
  [/bg-\[#0a0a0f\]/g, 'bg-bg'],
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(full);
    } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
      let content = fs.readFileSync(full, 'utf8');
      let changed = false;
      for (const [pattern, replacement] of replacements) {
        const next = content.replace(pattern, replacement);
        if (next !== content) changed = true;
        content = next;
      }
      if (changed) {
        fs.writeFileSync(full, content, 'utf8');
        console.log('Fixed:', full);
      }
    }
  }
}

walk(SRC_DIR);
console.log('Done.');
