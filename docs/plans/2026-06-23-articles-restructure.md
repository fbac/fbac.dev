# Articles Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use umbrella:subagent-driven-development (recommended) or umbrella:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. During per-task and final review, ALSO apply umbrella:review-lens (composed-surface-per-persona + walk-only flagging).

**Goal:** Replace the single full-viewport hero landing with a content-forward personal site: a shared martinkysel-style header on every page, an Articles index home, a separate `/about`, locally-authored Markdown articles at `/articles/<slug>` with syntax highlighting, RSS, and the two Medium posts migrated in.

**Architecture:** Astro 6 static site. Chrome (Header + main + Footer) is centralized in `Layout.astro` so every route shares an identical header (active nav per route). Articles live in an `astro:content` collection (glob loader + zod schema); index, post route, and RSS all query it. Styling reuses the existing Slate & Copper CSS tokens; new article-body typography lives in `prose.css`. Shiki (Astro built-in) does code highlighting. No client JS added.

**Tech Stack:** Astro 6.1.2, `astro:content` (content layer), `@astrojs/rss` (new dep), `@astrojs/sitemap` (existing), Shiki (built-in), Vitest (new devDep, for the pure date util only), native `Intl`/`Date`.

**Spec:** `docs/specs/2026-06-23-articles-restructure-design.md`

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/lib/date.ts` | pure `formatList` / `formatLong` date formatters | create |
| `test/date.test.ts` | unit tests for date util | create |
| `vitest.config.ts` | minimal vitest config | create |
| `src/content/articles/*.md` | migrated posts | create |
| `public/img/articles/<slug>/*` | migrated post images | create |
| `src/content.config.ts` | `articles` collection (glob + zod schema) | create |
| `astro.config.mjs` | add `markdown.shikiConfig` | modify |
| `src/components/SocialLinks.astro` | icon row: drop blog, add RSS | modify |
| `src/components/Header.astro` | sigil + name + subtitle + link row + separator | create |
| `src/components/ArticleList.astro` | query + render the article index list | create |
| `src/layouts/Layout.astro` | shell: Header + `<main>` + Footer, `active` prop, drop Fraunces | modify |
| `src/pages/index.astro` | Articles index home | modify |
| `src/pages/about.astro` | bio (ports old Hero copy) | create |
| `src/styles/prose.css` | typography for rendered article bodies | create |
| `src/pages/articles/[...slug].astro` | per-post route + render | create |
| `src/pages/rss.xml.js` | RSS feed | create |
| `src/pages/404.astro` | not-found | create |
| `src/components/Hero.astro` | (replaced) | delete |
| `src/components/Articles.astro` | (replaced) | delete |
| `articles/` (top-level) | empty leftover dir | delete |

---

## Task 1: Date utility (TDD) — `static-verifiable`

**Files:**
- Create: `src/lib/date.ts`
- Create: `test/date.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (devDep + script)

- [ ] **Step 1: Install deps + add Vitest**

If `node_modules/` is absent (fresh clone), hydrate base deps first:
```bash
npm install
```
Then add Vitest:
```bash
npm install -D vitest@^3
```
Expected: `vitest` added under `devDependencies`.

- [ ] **Step 2: Add the test script**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run"
```

- [ ] **Step 3: Minimal vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 4: Write the failing test**

Create `test/date.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { formatList, formatLong } from '../src/lib/date';

describe('formatList', () => {
  it('formats as zero-padded YYYY-MM in UTC', () => {
    expect(formatList(new Date('2022-09-01T00:00:00Z'))).toBe('2022-09');
    expect(formatList(new Date('2024-02-01T00:00:00Z'))).toBe('2024-02');
  });

  it('does not roll to the previous month at UTC midnight', () => {
    // In a negative-offset TZ this instant is Jan 31; the UTC slice must stay 2024-02.
    expect(formatList(new Date('2024-02-01T00:00:00Z'))).toBe('2024-02');
  });
});

describe('formatLong', () => {
  it('formats a long human date in UTC', () => {
    expect(formatLong(new Date('2024-02-01T00:00:00Z'))).toBe('February 1, 2024');
    expect(formatLong(new Date('2022-09-01T00:00:00Z'))).toBe('September 1, 2022');
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `../src/lib/date` (module not found).

- [ ] **Step 6: Implement the date util**

Create `src/lib/date.ts`:
```ts
/** Compact, zero-padded `YYYY-MM` for the article index. UTC-based to avoid
 *  timezone rollover (a `-01` date can become the prior month in negative TZs). */
export function formatList(d: Date): string {
  return d.toISOString().slice(0, 7);
}

const longFmt = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' });

/** Human-readable `Month D, YYYY` for post headers. */
export function formatLong(d: Date): string {
  return longFmt.format(d);
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 3 tests pass.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts test/date.test.ts src/lib/date.ts
git commit -m "feat: add date formatting util with vitest"
```

---

## Task 2: Migrate the two Medium articles — `browser-walk-only`

**Files:**
- Create: `src/content/articles/how-to-write-ebpf-programs-with-golang.md`
- Create: `src/content/articles/you-can-write-a-zkproof-too.md`
- Create: `public/img/articles/how-to-write-ebpf-programs-with-golang/*`
- Create: `public/img/articles/you-can-write-a-zkproof-too/*`

> Body content is fetched at execution time, so the exact Markdown body is not in this
> plan. The procedure, frontmatter, and conversion rules are fully specified below.

- [ ] **Step 1: Fetch both source articles**

Use the `WebFetch` tool on each URL with the prompt "Return the full article body as clean Markdown: preserve all headings, paragraphs, lists, blockquotes, and fenced code blocks with their language; list every image URL with its alt text":
- `https://blog.devgenius.io/how-to-write-ebpf-programs-with-golang-933d58fc5dba`
- `https://blog.fbac.dev/you-can-write-a-zkproof-too-4de7ddf83540`

If a fetch returns paywalled or partial content (missing code blocks / truncated body),
STOP and ask the user for a Medium export of that single post before continuing.

- [ ] **Step 2: Download images**

For each image URL returned, download into the matching folder:
```bash
mkdir -p public/img/articles/how-to-write-ebpf-programs-with-golang
mkdir -p public/img/articles/you-can-write-a-zkproof-too
# curl -L "<image-url>" -o public/img/articles/<slug>/<descriptive-name>.<ext>
```
Use descriptive lowercase filenames. Note each saved path.

- [ ] **Step 3: Write the eBPF post**

Create `src/content/articles/how-to-write-ebpf-programs-with-golang.md` with this exact
frontmatter, then the cleaned Markdown body below it:
```md
---
title: "How to write eBPF programs with Golang"
date: 2022-09-01
description: "Making sense of eBPF, BTF, bpf2go and Golang."
draft: false
---

<!-- cleaned Markdown body from Step 1 goes here -->
```
Rewrite every image reference to an absolute public path:
`![alt](/img/articles/how-to-write-ebpf-programs-with-golang/<name>.<ext>)`.
Ensure each code block has a correct language fence (```go, ```c, ```bash, ...).

- [ ] **Step 4: Write the ZKProof post**

Create `src/content/articles/you-can-write-a-zkproof-too.md`:
```md
---
title: "You can write a ZKProof too!"
date: 2024-02-01
description: "Zero-knowledge proofs demystified with a practical implementation."
draft: false
---

<!-- cleaned Markdown body from Step 1 goes here -->
```
Same image-path and code-fence rules, under
`/img/articles/you-can-write-a-zkproof-too/`.

- [ ] **Step 5: Manually verify the conversion**

Read both `.md` files. Confirm: no stray Medium HTML/artifacts, every code block has a
language, every image path points at a downloaded file. (Schema + render are validated
by build in later tasks; visual correctness is verified in the Browser-Walk Inventory.)

- [ ] **Step 6: Commit**

```bash
git add src/content/articles public/img/articles
git commit -m "content: migrate two Medium articles to local markdown"
```

---

## Task 3: Content collection + Shiki — `static-verifiable`

**Files:**
- Create: `src/content.config.ts`
- Modify: `astro.config.mjs`

- [ ] **Step 1: Define the collection**

Create `src/content.config.ts`:
```ts
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles };
```

- [ ] **Step 2: Configure Shiki**

Replace `astro.config.mjs` with:
```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://fbac.dev',
  output: 'static',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { theme: 'github-dark-default', wrap: true },
  },
});
```

- [ ] **Step 3: Build to validate the schema against migrated content**

Run: `npm run build`
Expected: build succeeds; no content schema errors for either article. (If `date`,
`title`, or `description` is missing/malformed in a `.md`, the build fails here — fix the
frontmatter.)

- [ ] **Step 4: Commit**

```bash
git add src/content.config.ts astro.config.mjs
git commit -m "feat: add articles content collection and shiki config"
```

---

## Task 4: Update SocialLinks (drop blog, add RSS) — `browser-walk-only`

**Files:**
- Modify: `src/components/SocialLinks.astro`

- [ ] **Step 1: Replace the component**

Replace the entire contents of `src/components/SocialLinks.astro` with:
```astro
---
---

<nav class="social-links" aria-label="Social links">
  <a href="https://github.com/fbac" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
  </a>
  <a href="https://www.linkedin.com/in/fbac/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
  </a>
  <a href="https://x.com/0xfbac" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  </a>
  <a href="/rss.xml" aria-label="RSS feed">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.18 15.64a2.18 2.18 0 1 1 0 4.36 2.18 2.18 0 0 1 0-4.36zM4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27zm0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93z"/></svg>
  </a>
  <a href="mailto:me@fbac.dev" aria-label="Email">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>
  </a>
</nav>

<style>
  .social-links {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.9rem;
  }

  .social-links a {
    color: var(--color-text-muted);
    transition: color var(--transition-fast);
    display: flex;
    align-items: center;
  }

  .social-links a:hover {
    color: var(--color-accent);
    opacity: 1;
  }

  .social-links svg {
    width: 19px;
    height: 19px;
  }
</style>
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success. (`/rss.xml` 404s until Task 10 — link target verified in the walk.)

- [ ] **Step 3: Commit**

```bash
git add src/components/SocialLinks.astro
git commit -m "feat: swap blog icon for RSS in social links"
```

---

## Task 5: Header component — `browser-walk-only`

**Files:**
- Create: `src/components/Header.astro`

- [ ] **Step 1: Create the header**

Create `src/components/Header.astro`:
```astro
---
import SocialLinks from './SocialLinks.astro';

interface Props {
  active?: 'articles' | 'about';
}
const { active } = Astro.props;
---

<header class="site-header">
  <a class="brand" href="/" aria-label="Home — Borja Aranda">
    <span class="sigil" aria-hidden="true">BA</span>
    <span class="brand-text">
      <span class="h-name">Borja Aranda</span>
      <span class="h-tag">Staff Engineer · distributed systems · protocol engineering</span>
    </span>
  </a>

  <div class="linkrow">
    <nav class="nav-text" aria-label="Sections">
      <a href="/" class={active === 'articles' ? 'active' : ''}>articles</a>
      <a href="/about" class={active === 'about' ? 'active' : ''}>about</a>
    </nav>
    <span class="nav-divider" aria-hidden="true"></span>
    <SocialLinks />
  </div>
</header>

<hr class="header-sep" />

<style>
  .site-header { padding-top: 0.5rem; }

  .brand {
    display: flex;
    align-items: center;
    gap: 1.1rem;
    color: inherit;
  }
  .brand:hover { opacity: 1; }

  .sigil {
    flex-shrink: 0;
    width: 72px;
    height: 72px;
    border: 1.5px solid var(--color-accent);
    border-radius: 12px;
    color: var(--color-accent);
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 1.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .brand-text { display: flex; flex-direction: column; justify-content: center; }
  .h-name { font-size: 1.9rem; font-weight: 700; letter-spacing: -0.03em; line-height: 1.15; color: var(--color-text); }
  .h-tag { font-family: var(--font-mono); font-size: 0.78rem; color: var(--color-text-muted); margin-top: 0.3rem; }

  .linkrow {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 1.1rem;
    margin-top: 1.75rem;
  }

  .nav-text { display: flex; gap: 1.1rem; font-size: 0.95rem; }
  .nav-text a { color: var(--color-text-muted); }
  .nav-text a:hover { color: var(--color-accent); opacity: 1; }
  .nav-text a.active { color: var(--color-text); border-bottom: 2px solid var(--color-accent); padding-bottom: 1px; }

  .nav-divider { width: 1px; height: 18px; background: var(--color-border); }

  .header-sep {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: 1.5rem 0 1.9rem;
  }

  @media (max-width: 560px) {
    .linkrow { justify-content: flex-start; }
    .sigil { width: 60px; height: 60px; font-size: 1.3rem; }
    .h-name { font-size: 1.6rem; }
  }
</style>
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success (component compiles; not yet referenced).

- [ ] **Step 3: Commit**

```bash
git add src/components/Header.astro
git commit -m "feat: add shared site header component"
```

---

## Task 6: ArticleList component — `browser-walk-only`

**Files:**
- Create: `src/components/ArticleList.astro`

- [ ] **Step 1: Create the list**

Create `src/components/ArticleList.astro`:
```astro
---
import { getCollection } from 'astro:content';
import { formatList } from '../lib/date';

const posts = (
  await getCollection('articles', ({ data }) => (import.meta.env.PROD ? !data.draft : true))
).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
---

<section class="articles">
  <h2 class="sec-h">Articles</h2>
  {posts.length === 0 ? (
    <p class="empty">No articles yet.</p>
  ) : (
    <ul class="post-list">
      {posts.map((p) => (
        <li>
          <span class="pdate">{formatList(p.data.date)}</span>
          <span class="pbody">
            <a class="ptitle" href={`/articles/${p.id}/`}>{p.data.title}</a>
            <span class="pdesc">{p.data.description}</span>
          </span>
        </li>
      ))}
    </ul>
  )}
</section>

<style>
  .sec-h { font-size: 1.1rem; margin: 0 0 0.9rem; color: var(--color-text); }
  .empty { color: var(--color-text-dim); font-size: 0.9rem; }

  .post-list { list-style: none; display: flex; flex-direction: column; gap: 0.2rem; }
  .post-list li { display: flex; gap: 1rem; align-items: baseline; padding: 0.55rem 0; }

  .pdate { font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-text-dim); white-space: nowrap; min-width: 4.5rem; }
  .pbody { display: flex; flex-direction: column; }
  .ptitle { font-size: 1rem; color: var(--color-accent); }
  .pdesc { font-size: 0.85rem; color: var(--color-text-dim); }
</style>
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success (compiles; not yet referenced).

- [ ] **Step 3: Commit**

```bash
git add src/components/ArticleList.astro
git commit -m "feat: add article list component"
```

---

## Task 7: Shared shell — Layout refactor + index rewrite — `browser-walk-only`

> Layout and index are tightly coupled (the shell move). Do both in this task so no
> intermediate build renders a doubled header/footer.

**Files:**
- Modify: `src/layouts/Layout.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Refactor the Layout**

Replace the entire contents of `src/layouts/Layout.astro` with:
```astro
---
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '../styles/global.css';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';

interface Props {
  title?: string;
  description?: string;
  active?: 'articles' | 'about';
}

const {
  title = 'Borja Aranda — Staff Engineer',
  description = 'Staff Engineer specializing in distributed systems, protocol engineering, and infrastructure. 15+ years building production systems.',
  active,
} = Astro.props;

const canonicalURL = new URL(Astro.url.pathname, Astro.site);
const ogImage = new URL('/img/avatar.png', Astro.site);
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="generator" content={Astro.generator} />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonicalURL} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonicalURL} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={ogImage} />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="theme-color" content="#0f172a" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="alternate" type="application/rss+xml" title="Borja Aranda — Articles" href="/rss.xml" />
  </head>
  <body>
    <Header active={active} />
    <main>
      <slot />
    </main>
    <Footer />

    <style>
      main {
        max-width: var(--content-max-width);
        margin: 0 auto;
        padding: 0 1.5rem;
      }
    </style>
  </body>
</html>
```

> Notes: Fraunces import removed (unused). RSS `<link rel="alternate">` added for feed
> discovery. `og:image` keeps `avatar.png` as the interim social card (spec §3.3/§10).

- [ ] **Step 2: Rewrite the home page**

Replace the entire contents of `src/pages/index.astro` with:
```astro
---
import Layout from '../layouts/Layout.astro';
import ArticleList from '../components/ArticleList.astro';
---

<Layout active="articles">
  <ArticleList />
</Layout>
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success. `dist/index.html` contains the header (sigil `BA`, name, `articles`
nav with active underline) and the article list with both migrated posts.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/Layout.astro src/pages/index.astro
git commit -m "feat: centralize header/footer in layout, articles index home"
```

---

## Task 8: About page + prose styles — `browser-walk-only`

**Files:**
- Create: `src/styles/prose.css`
- Create: `src/pages/about.astro`

- [ ] **Step 1: Create prose typography**

Create `src/styles/prose.css`:
```css
.prose { max-width: var(--content-max-width); }

.prose h1 {
  font-size: 2rem;
  letter-spacing: -0.03em;
  margin-bottom: 1.25rem;
}
.prose h2 { font-size: 1.4rem; margin: 2.25rem 0 0.9rem; }
.prose h3 { font-size: 1.15rem; margin: 1.75rem 0 0.75rem; }

.prose p { margin-bottom: 1.15rem; color: var(--color-text); }
.prose a { color: var(--color-accent); text-decoration: underline; text-underline-offset: 2px; }

.prose ul, .prose ol { margin: 0 0 1.15rem 1.5rem; }
.prose li { margin-bottom: 0.4rem; }

.prose blockquote {
  border-left: 3px solid var(--color-accent);
  padding-left: 1rem;
  margin: 0 0 1.15rem;
  color: var(--color-text-muted);
}

.prose img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 1.5rem 0;
}

.prose :not(pre) > code {
  font-family: var(--font-mono);
  font-size: 0.85em;
  background: var(--color-bg-card);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.prose pre {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  overflow-x: auto;
  margin: 0 0 1.4rem;
}

.prose table { width: 100%; border-collapse: collapse; margin: 0 0 1.4rem; font-size: 0.9rem; }
.prose th, .prose td { border: 1px solid var(--color-border); padding: 0.5rem 0.75rem; text-align: left; }

.post-date {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-text-dim);
  margin-top: -0.75rem;
  margin-bottom: 2rem;
}
```

- [ ] **Step 2: Create the about page**

Create `src/pages/about.astro`:
```astro
---
import Layout from '../layouts/Layout.astro';
import '../styles/prose.css';
---

<Layout active="about" title="About — Borja Aranda">
  <article class="prose">
    <h1>About</h1>
    <p>Staff Engineer — distributed systems, protocol engineering, infrastructure.</p>
    <p>
      15+ years building low-level protocols, distributed backends, and production
      infrastructure — from Linux kernel and Kubernetes at Red Hat to decentralized
      protocol architectures at XMTP, Chainlink, and ZetaChain.
    </p>
  </article>
</Layout>
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success; `dist/about/index.html` exists, header shows `about` active.

- [ ] **Step 4: Commit**

```bash
git add src/styles/prose.css src/pages/about.astro
git commit -m "feat: add about page and prose typography"
```

---

## Task 9: Post route — `browser-walk-only`

**Files:**
- Create: `src/pages/articles/[...slug].astro`

- [ ] **Step 1: Create the dynamic post route**

Create `src/pages/articles/[...slug].astro`:
```astro
---
import { getCollection, render } from 'astro:content';
import Layout from '../../layouts/Layout.astro';
import { formatLong } from '../../lib/date';
import '../../styles/prose.css';

export async function getStaticPaths() {
  const posts = await getCollection('articles', ({ data }) =>
    import.meta.env.PROD ? !data.draft : true
  );
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await render(post);
---

<Layout active="articles" title={`${post.data.title} — Borja Aranda`} description={post.data.description}>
  <article class="prose">
    <h1>{post.data.title}</h1>
    <p class="post-date">{formatLong(post.data.date)}</p>
    <Content />
  </article>
</Layout>
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success; `dist/articles/how-to-write-ebpf-programs-with-golang/index.html` and
`dist/articles/you-can-write-a-zkproof-too/index.html` exist.

- [ ] **Step 3: Commit**

```bash
git add src/pages/articles/[...slug].astro
git commit -m "feat: add article post route"
```

---

## Task 10: RSS feed — `static-verifiable`

**Files:**
- Modify: `package.json` (add `@astrojs/rss`)
- Create: `src/pages/rss.xml.js`

- [ ] **Step 1: Add the RSS package**

Run:
```bash
npm install @astrojs/rss
```
Expected: `@astrojs/rss` added under `dependencies`.

- [ ] **Step 2: Create the feed endpoint**

Create `src/pages/rss.xml.js`:
```js
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = (
    await getCollection('articles', ({ data }) => (import.meta.env.PROD ? !data.draft : true))
  ).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: 'Borja Aranda — Articles',
    description: 'Distributed systems, protocol engineering, infrastructure.',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/articles/${post.id}/`,
    })),
  });
}
```

- [ ] **Step 3: Build and inspect the feed**

Run: `npm run build`
Expected: success; `dist/rss.xml` exists.

Run: `grep -c "<item>" dist/rss.xml`
Expected: `2`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/pages/rss.xml.js
git commit -m "feat: add RSS feed"
```

---

## Task 11: 404 page — `browser-walk-only`

**Files:**
- Create: `src/pages/404.astro`

- [ ] **Step 1: Create the not-found page**

Create `src/pages/404.astro`:
```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout title="Not found — Borja Aranda">
  <section class="notfound">
    <h1>404</h1>
    <p>That page doesn't exist.</p>
    <p><a href="/">← Back to articles</a></p>
  </section>

  <style>
    .notfound { padding: 2rem 0; }
    .notfound h1 { font-size: 3rem; color: var(--color-accent); margin-bottom: 0.5rem; }
    .notfound p { color: var(--color-text-muted); margin-bottom: 0.5rem; }
  </style>
</Layout>
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success; `dist/404.html` exists with the shared header.

- [ ] **Step 3: Commit**

```bash
git add src/pages/404.astro
git commit -m "feat: add 404 page"
```

---

## Task 12: Cleanup + final verification — `static-verifiable`

**Files:**
- Delete: `src/components/Hero.astro`
- Delete: `src/components/Articles.astro`
- Delete: `articles/` (top-level empty dir)

- [ ] **Step 1: Delete replaced files**

Run:
```bash
git rm src/components/Hero.astro src/components/Articles.astro
rmdir articles 2>/dev/null || true
```

- [ ] **Step 2: Verify no dangling references**

Run: `grep -rn "Hero\|components/Articles" src/ ; echo "exit:$?"`
Expected: no matches (grep exit `1`, printed as `exit:1`).

Run: `grep -rni "blog" src/`
Expected: no matches in nav/links (the only acceptable hit would be inside migrated
article body prose, not navigation). Confirm any hit is article content, not a link/label.

- [ ] **Step 3: Full build + test**

Run: `npm run build && npm test`
Expected: build succeeds; date tests pass.

Run: `ls dist/index.html dist/about/index.html dist/rss.xml dist/404.html dist/articles/*/index.html dist/sitemap-index.xml`
Expected: every path exists (2 article dirs).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove replaced Hero and Articles components"
```

---

## Self-Review notes (author)

- Spec coverage: header (T5/T7), shared shell (T7), articles index (T6/T7), about (T8),
  post route (T9), collection+schema (T3), Shiki (T3), migration (T2), RSS (T10),
  sitemap (existing, verified T12), 404 (T11), date util incl. TZ fix (T1), cleanup +
  Fraunces drop (T7/T12), OG interim (T7). All mapped.
- Type consistency: `formatList`/`formatLong` signatures match across T1/T6/T9;
  `post.id` slug used identically in T6/T9/T10; `active` prop union identical in
  Header/Layout.
- No placeholders except the deliberately execution-time-fetched article bodies (T2),
  which are bounded by an explicit procedure + fallback.

---

## Browser-Walk Inventory

Run `npm run build && npm run preview`, open the printed `http://localhost:4321`.
Anonymous visitor (no auth). Execute each case; all must pass before declaring done.

1. **Header consistency across routes.** Visit `/`, `/about`, `/articles/you-can-write-a-zkproof-too/`, and a bad URL like `/nope` (renders 404 in `preview`). On all four the header is identical: copper monogram sigil `BA` (left) with `Borja Aranda` + the mono subtitle stacked to its right, and a right-aligned link row (`articles  about  |  icons`). Pass = byte-for-byte same header, no layout shift between pages.

2. **Active nav per route.** On `/` and on a post page, the `articles` link is full-strength text with a 2px copper underline and `about` is muted. On `/about`, `about` is underlined and `articles` is muted. On the 404, neither is underlined. Pass = active state matches the route in every case.

3. **Brand home links.** On `/about`, click the sigil — lands on `/`. Reload `/about`, click the name `Borja Aranda` — also lands on `/`. Pass = both the sigil and the name navigate home.

4. **Sigil spans both text lines.** On any page, the sigil square's top aligns with the top of `Borja Aranda` and its bottom aligns with the bottom of the subtitle line (it visually spans both). Pass = sigil height ≈ name+subtitle block height, vertically centered.

5. **Link row alignment + mobile reflow.** At desktop width the link row sits flushed to the right edge of the 720px column. Narrow the window below 560px: the link row left-aligns and wraps without overflowing; the sigil shrinks. Pass = no horizontal scroll, no clipped icons at mobile width.

6. **Article index list.** On `/`, both posts appear newest-first: `2024-02` ZKProof above `2022-09` eBPF. Each row shows the mono date, a copper title link, and a dim description. Click each title — lands on the correct post. Pass = order, dates, and links all correct.

7. **Post rendering — code + images.** Open each migrated post. Code blocks are syntax-highlighted (colored tokens on the dark `github-dark-default` background), long lines wrap (no horizontal scroll inside `pre`). Every image loads (no broken-image icon). Headings/paragraphs have comfortable rhythm; the long-form date sits under the title. Pass = highlighted code, all images visible, readable typography.

8. **Separator + spacing.** Below the header on every page there is a single subtle 1px border separator before content; vertical spacing matches the approved `layout-c3` mockup. Pass = one separator, balanced spacing, no double rules.

9. **Social icons resolve.** In the header, hover each icon (turns copper). Click RSS → `/rss.xml` renders a valid feed listing both articles newest-first. Click email → opens `mailto:me@fbac.dev`. GitHub/LinkedIn/X point at the correct external profiles. Pass = every icon target resolves; RSS lists 2 items.

10. **404 surface.** Visit `/nope`. The shared header renders, the body shows `404`, an explanation, and a working `← Back to articles` link to `/`. Pass = header present + home link works.
