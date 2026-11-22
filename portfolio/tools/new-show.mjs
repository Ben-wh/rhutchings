#!/usr/bin/env node
// Creates a new show folder from the template and adds it to the board.
//
//   node tools/new-show.mjs "Les Misérables"
//   node tools/new-show.mjs "Les Misérables" les-mis      (custom folder name)
//
// Then fill in shows/<folder>/show.json and drop the poster/photos in that folder.

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const showsDir = path.join(root, 'shows');

const [title, customSlug] = process.argv.slice(2);
if (!title) {
  console.error('Usage: node tools/new-show.mjs "Show Title" [folder-name]');
  process.exit(1);
}

const slug = (customSlug || title)
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

if (!/^[\w-]+$/.test(slug)) {
  console.error(`Couldn't make a folder name from "${title}". Pass one as the second argument.`);
  process.exit(1);
}

const folder = path.join(showsDir, slug);
try {
  await access(folder);
  console.error(`shows/${slug} already exists.`);
  process.exit(1);
} catch { /* doesn't exist: good */ }

const template = {
  title,
  category: '',
  year: new Date().getFullYear(),
  dates: '',
  venue: '',
  company: '',
  role: '',
  poster: 'poster.jpg',
  summary: '',
  about: [''],
  responsibilities: [''],
  kit: [],
  gallery: [],
  credits: [],
};

await mkdir(folder, { recursive: true });
await writeFile(path.join(folder, 'show.json'), JSON.stringify(template, null, 2) + '\n');

const manifestPath = path.join(showsDir, 'shows.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.push(slug);
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`Created shows/${slug}/show.json and added it to shows/shows.json`);
console.log(`Page: show.html?show=${slug}`);
