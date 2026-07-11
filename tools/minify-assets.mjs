/**
 * Conservative CSS/JS minifier (no npm deps).
 * - CSS: strip comments, collapse whitespace
 * - JS: strip comments, collapse blank lines / trailing spaces (keep structure)
 * Source files stay readable; *.min.* are what HTML should load.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function minifyCss(s) {
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/\s*([{}:;,>~+])\s*/g, '$1');
  s = s.replace(/;}/g, '}');
  return s.trim() + '\n';
}

// Strip line and block comments outside strings; compress blank lines.
function minifyJs(src) {
  let out = '';
  let i = 0;
  let state = 'code'; // code | s | d | t | line | block | regex?
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];

    if (state === 'line') {
      if (c === '\n') {
        out += '\n';
        state = 'code';
      }
      i++;
      continue;
    }
    if (state === 'block') {
      if (c === '*' && n === '/') {
        state = 'code';
        i += 2;
      } else {
        i++;
      }
      continue;
    }
    if (state === 's') {
      out += c;
      if (c === '\\' && i + 1 < src.length) {
        out += src[i + 1];
        i += 2;
        continue;
      }
      if (c === "'") state = 'code';
      i++;
      continue;
    }
    if (state === 'd') {
      out += c;
      if (c === '\\' && i + 1 < src.length) {
        out += src[i + 1];
        i += 2;
        continue;
      }
      if (c === '"') state = 'code';
      i++;
      continue;
    }
    if (state === 't') {
      out += c;
      if (c === '\\' && i + 1 < src.length) {
        out += src[i + 1];
        i += 2;
        continue;
      }
      if (c === '`') state = 'code';
      i++;
      continue;
    }

    // code
    if (c === "'" ) { out += c; state = 's'; i++; continue; }
    if (c === '"' ) { out += c; state = 'd'; i++; continue; }
    if (c === '`' ) { out += c; state = 't'; i++; continue; }
    if (c === '/' && n === '/') { state = 'line'; i += 2; continue; }
    if (c === '/' && n === '*') { state = 'block'; i += 2; continue; }
    out += c;
    i++;
  }

  // Collapse runs of spaces/tabs on a line, drop empty lines, trim line ends
  out = out
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
    .filter((line) => line.trim().length > 0)
    .join('\n');

  // Join lines that are only structural (optional mild compaction)
  // Keep newlines for safety — HubSpot mainly checks absence of pretty-print sprawl / comments
  return out.trim() + '\n';
}

function writeMin(relIn, relOut, kind) {
  const inPath = path.join(root, relIn);
  const outPath = path.join(root, relOut);
  const src = fs.readFileSync(inPath, 'utf8');
  const out = kind === 'css' ? minifyCss(src) : minifyJs(src);
  fs.writeFileSync(outPath, out);
  const pct = ((1 - out.length / src.length) * 100).toFixed(1);
  console.log(`${relIn} -> ${relOut}: ${src.length} -> ${out.length} (${pct}% smaller)`);
}

writeMin('css/secs.css', 'css/secs.min.css', 'css');

const js = [
  'js/includes.js',
  'js/secs.js',
  'js/journal-sync.js',
  'js/envelope-primer.js',
];
for (const f of js) {
  writeMin(f, f.replace(/\.js$/, '.min.js'), 'js');
}

for (const f of js) {
  const min = path.join(root, f.replace(/\.js$/, '.min.js'));
  const code = fs.readFileSync(min, 'utf8');
  try {
    new Function(code);
    console.log('syntax OK', path.basename(min));
  } catch (e) {
    console.error('SYNTAX FAIL', path.basename(min), e.message);
    process.exitCode = 1;
  }
}
