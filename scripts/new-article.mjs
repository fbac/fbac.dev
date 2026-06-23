#!/usr/bin/env node
// Scaffold a new article: npm run new "My Article Title"
// Creates src/content/articles/<slug>.md with frontmatter stamped to today, as a draft.
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const title = process.argv.slice(2).join(' ').trim();
if (!title) {
  console.error('Usage: npm run new "Article Title"');
  process.exit(1);
}

const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

if (!slug) {
  console.error(`Could not derive a slug from "${title}".`);
  process.exit(1);
}

const dir = 'src/content/articles';
const file = join(dir, `${slug}.md`);
if (existsSync(file)) {
  console.error(`Already exists: ${file} — pick a different title or edit that file.`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const body = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${today}
description: ""
draft: true
---

`;

mkdirSync(dir, { recursive: true });
writeFileSync(file, body);
console.log(
  `Created ${file}\n  date: ${today} · draft: true\n  → fill in description, write the body, set draft: false to publish.`,
);
