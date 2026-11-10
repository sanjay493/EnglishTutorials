// Shared helpers for the English 120 build scripts.
// Plain Node.js, no dependencies. Run with: node scripts/<script>.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DAYS_DIR = path.join(ROOT, 'days');
export const OPS_DIR = path.join(ROOT, 'ops');
export const LESSON_FILE = /^day-(\d{3})\.md$/;

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

export function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

export function readCurriculum() {
  const data = readJson(path.join(OPS_DIR, 'curriculum.json'));
  const modules = new Map(data.modules.map((m) => [m.id, m]));
  return { ...data, moduleById: modules };
}

/** Minimal YAML front matter parser: flat key/value pairs only. */
export function parseFrontMatter(text) {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return { data: {}, body: normalized };
  const end = normalized.indexOf('\n---', 4);
  if (end === -1) return { data: {}, body: normalized };
  const raw = normalized.slice(4, end);
  const body = normalized.slice(end + 4).replace(/^\n+/, '');
  const data = {};
  for (const line of raw.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const i = line.indexOf(':');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (/^-?\d+$/.test(value)) value = Number(value);
    else if (value === 'true') value = true;
    else if (value === 'false') value = false;
    data[key] = value;
  }
  return { data, body };
}

export function listLessons() {
  if (!fs.existsSync(DAYS_DIR)) return [];
  return fs
    .readdirSync(DAYS_DIR)
    .map((name) => {
      const match = LESSON_FILE.exec(name);
      if (!match) return null;
      const file = path.join(DAYS_DIR, name);
      const { data, body } = parseFrontMatter(readText(file));
      const words = typeof data.words === 'number' ? data.words : countWords(body);
      return {
        ...data,
        day: data.day ?? Number(match[1]),
        file,
        filePath: `days/${name}`,
        slug: `day-${String(data.day ?? Number(match[1])).padStart(3, '0')}`,
        status: data.status ?? 'draft',
        words,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.day - b.day);
}

export function countWords(text) {
  const plain = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_|~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain ? plain.split(' ').length : 0;
}

export function dayNumber(day) {
  return String(day).padStart(3, '0');
}

export function dayLink(day) {
  return `days/day-${dayNumber(day)}.md`;
}

export function lessonExists(day) {
  return fs.existsSync(path.join(DAYS_DIR, `day-${dayNumber(day)}.md`));
}

export function bar(done, total, width = 24) {
  const filled = total === 0 ? 0 : Math.round((done / total) * width);
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled));
}

export function pct(done, total) {
  if (!total) return '0%';
  return `${Math.round((done / total) * 100)}%`;
}

/** Writes only when content changed. Returns true when the file was updated. */
export function writeIfChanged(file, content) {
  const normalized = content.replace(/\r\n/g, '\n');
  if (fs.existsSync(file)) {
    const current = readText(file).replace(/\r\n/g, '\n');
    if (current === normalized) return false;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, normalized, 'utf8');
  return true;
}

export function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

export function nowIso() {
  return new Date().toISOString();
}
