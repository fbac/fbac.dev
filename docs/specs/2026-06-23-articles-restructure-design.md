# Design: Restructure landing + add Articles section

**Date:** 2026-06-23
**Status:** Approved-pending-review
**Scope:** Single implementation plan.

## 1. Goal

Convert the single-page, full-viewport "hero card" landing into a content-forward
personal site in the spirit of jvns.ca / martinkysel.com:

- A compact, **shared header** (sigil + name + subtitle, then a right-aligned link
  row) that appears identically on every page.
- The home page becomes an **Articles index** (list of posts), not a centered bio.
- A separate **`/about`** page holds the longer bio.
- Self-hosted **articles** authored in Markdown via an Astro content collection,
  rendered at `/articles/<slug>`, with syntax highlighting and images.
- The two existing Medium posts are **migrated** into local Markdown.
- **RSS** at `/rss.xml`; sitemap continues to cover all routes.

Non-goals are listed in §11.

## 2. Current state (baseline)

- Astro 6.1.2, `output: 'static'`, deploys to GitHub Pages (CNAME `fbac.dev`) via
  `.github/workflows/push-to-ghpages.yaml` (Node 22, `withastro/action@v3`).
- `src/pages/index.astro` → `Layout` + `Hero` (full-viewport centered card) + `Footer`.
- `src/components/`: `Hero.astro`, `SocialLinks.astro` (github/linkedin/x/**blog**/email),
  `Footer.astro`, `Articles.astro` (unused; hardcodes the 2 Medium links).
- `src/styles/global.css`: Slate & Copper tokens (CSS variables). Fonts: Inter (sans),
  JetBrains Mono (mono), Fraunces (imported in `Layout.astro` but **unused**).
- `@astrojs/sitemap` integrated. No content collections, no markdown rendering config,
  no RSS, no syntax highlighting yet.
- `Layout.astro` `og:image` points at `/img/avatar.png` (the photo we are removing).

## 3. Target architecture

### 3.1 File tree (after)

```
src/
├── content.config.ts            # NEW: 'articles' collection (glob loader + zod schema)
├── content/
│   └── articles/                # NEW: one .md per post
│       ├── how-to-write-ebpf-programs-with-golang.md
│       └── you-can-write-a-zkproof-too.md
├── layouts/
│   └── Layout.astro             # CHANGED: shell now renders Header + <main> + Footer
├── components/
│   ├── Header.astro             # NEW: sigil + name + subtitle + link row (shared)
│   ├── SocialLinks.astro        # CHANGED: drop "blog", add RSS → /rss.xml
│   ├── ArticleList.astro        # NEW: <date · title · desc> list from the collection
│   └── Footer.astro             # UNCHANGED (now invoked by Layout, not pages)
├── lib/
│   └── date.ts                  # NEW: formatList() + formatLong() (native Intl)
├── pages/
│   ├── index.astro              # CHANGED: Header(active=articles) + ArticleList
│   ├── about.astro              # NEW: bio (text moved out of old Hero)
│   ├── articles/
│   │   └── [...slug].astro      # NEW: render one post (getStaticPaths + render())
│   ├── rss.xml.js               # NEW: @astrojs/rss feed
│   └── 404.astro                # NEW: minimal not-found, header + link home
└── styles/
    ├── global.css               # CHANGED: minor — see §3.6
    └── prose.css                # NEW: typography for rendered article bodies
public/
└── img/
    └── articles/<slug>/...      # NEW: migrated post images (absolute-path refs)
```

`src/components/Hero.astro`, `src/components/Articles.astro`, and the empty
top-level `articles/` directory are **deleted**.

### 3.2 Shared header (`Header.astro`)

Layout (matches the approved `layout-c3` mockup):

```
[ SIGIL ]  Borja Aranda
[  72px ]  Staff Engineer · distributed systems · protocol engineering

                                 articles   about   |   (gh)(li)(x)(rss)(mail)
────────────────────────────────────────────────────────────────────────────
```

- **Brand row:** square sigil (left) + name & subtitle stacked (right). The sigil is
  a `flex` square (~72px) whose height spans both text lines. Sigil **and** name are
  wrapped in a single `<a href="/">` — clicking either returns home.
- **Sigil asset:** placeholder = copper-bordered rounded square with mono monogram
  `BA`. Implemented as a self-contained `.sigil` element so the real wordmark/sigil
  (an `.svg` dropped into `public/`) can replace it by swapping one block. **No photo.**
- **Link row:** one flex row, `justify-content: flex-end` (right-aligned). Two groups
  separated by a thin vertical divider:
  - **Text nav** — internal sections: `articles`, `about`. Active route gets the
    `.active` treatment (full-strength text + 2px copper underline).
  - **Icon socials** — `SocialLinks` component: GitHub, LinkedIn, X, RSS, Email.
- A subtle 1px `--color-border` separator (`<hr>`) sits below the header, above page
  content.
- **Props:** `active?: 'articles' | 'about'` (omitted ⇒ no nav item highlighted, e.g.
  on 404).
- **Responsive:** at `≤560px` the link row falls back to `justify-content: flex-start`
  (left-aligned) and wraps; subtitle may shorten via existing token sizes.

### 3.3 Layout (`Layout.astro`) — shared shell

`Layout` becomes the single place that renders the chrome, guaranteeing header
consistency:

```
<html><head>…meta…</head>
  <body>
    <Header active={active} />
    <main><slot /></main>
    <Footer />
  </body>
</html>
```

- New prop `active?: 'articles' | 'about'`, forwarded to `Header`.
- `<main>` keeps `max-width: var(--content-max-width)` (720px), centered, `padding: 0 1.5rem`.
- `Footer` moves here (removed from `index.astro`) so every page shares it.
- `og:image`: the removed photo means `/img/avatar.png` is no longer the right OG
  image. **Interim:** keep the existing `avatar.png` file in `public/` as the OG image
  so social cards don't break; swap to a sigil/wordmark-based `og.png` when the real
  brand asset lands (tracked in §10). On-page, the photo is gone regardless.

### 3.4 Content collection (`content.config.ts`)

Astro 6 content layer, glob loader:

```ts
import { defineCollection, z } from 'astro:content';
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

- **Slug** derives from filename (loader `id`), e.g. `you-can-write-a-zkproof-too`.
- **Sorting:** date descending.
- **Drafts:** entries with `draft: true` are excluded from the index, post routes,
  and RSS in production builds (`import.meta.env.PROD`); visible in `astro dev`.

### 3.5 Routes

| Route | File | Renders |
|---|---|---|
| `/` | `pages/index.astro` | `Layout active="articles"` → `ArticleList` |
| `/about` | `pages/about.astro` | `Layout active="about"` → bio prose (ports the old `Hero` summary verbatim: 15+ yrs, Red Hat kernel/k8s → XMTP/Chainlink/ZetaChain) |
| `/articles/<slug>` | `pages/articles/[...slug].astro` | `Layout active="articles"` → `<article class="prose">` + `render()` body |
| `/rss.xml` | `pages/rss.xml.js` | `@astrojs/rss` feed |
| `/404` | `pages/404.astro` | `Layout` (no active) → not-found + home link |

- `[...slug].astro` uses `getStaticPaths()` over `getCollection('articles')`
  (draft-filtered in prod) and `render(entry)` (`astro:content`) for `<Content />`.
- Post header on the page: title (h1), long-form date, optional description; body
  rendered with `.prose` typography.

### 3.6 Styling

- **Reuse existing tokens** — no theme change. All new components use scoped
  `<style>` blocks plus the existing CSS variables.
- **`ArticleList`**: rows of `date (mono, dim) · title (copper link) · description
  (dim, smaller)`, matching the mockup. List, not cards.
- **`prose.css`**: typography for rendered article bodies — headings, paragraphs,
  links, lists, `blockquote`, inline `code`, `pre` blocks, images
  (`max-width: 100%`, rounded), tables. Imported by `[...slug].astro` and reusable by
  `/about`.
- **Syntax highlighting:** Astro's built-in Shiki, configured in `astro.config.mjs`:
  `markdown: { shikiConfig: { theme: 'github-dark-default', wrap: true } }`. Theme is
  a one-line tunable; chosen for legibility on the dark slate background. No client JS.
- **Date formatting (`lib/date.ts`):** no dependency.
  `formatList(d)` → `YYYY-MM` (compact, monospace, for the index) — build this from
  UTC parts (`getUTCFullYear()` + zero-padded `getUTCMonth()+1`, or
  `d.toISOString().slice(0,7)`), **not** `Intl.DateTimeFormat`: a `-01` date can roll
  to the prior month under a negative-offset timezone, and `Intl` won't emit a
  zero-padded `YYYY-MM` natively. `formatLong(d)` → `Month D, YYYY` via
  `Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' })` (post headers).
- **Optional cleanup:** drop the unused Fraunces import from `Layout.astro` (smaller
  font payload). Low-risk; included.

### 3.7 RSS + sitemap

- Add `@astrojs/rss`. `pages/rss.xml.js` builds the feed from
  `getCollection('articles')` (draft-filtered, date-desc), using `site`
  (`https://fbac.dev`), per-item `title`/`description`/`pubDate`/`link`
  (`/articles/<slug>`).
- The RSS icon in the header links to `/rss.xml`.
- `@astrojs/sitemap` already picks up all static routes — new pages auto-included.

## 4. Migration of the two Medium articles

Source → target:

| Source URL | Target file | `date` |
|---|---|---|
| `blog.devgenius.io/how-to-write-ebpf-programs-with-golang-933d58fc5dba` | `src/content/articles/how-to-write-ebpf-programs-with-golang.md` | 2022-09 |
| `blog.fbac.dev/you-can-write-a-zkproof-too-4de7ddf83540` | `src/content/articles/you-can-write-a-zkproof-too.md` | 2024-02 |

Procedure (implementation phase):

1. `WebFetch` each URL; extract article body, headings, code blocks, image URLs.
2. Convert to clean Markdown. **Manually verify code blocks** (language fences) and
   prose — Medium's HTML is noisy; this is the main migration risk.
3. Download referenced images into `public/img/articles/<slug>/`; rewrite body image
   references to absolute `/img/articles/<slug>/<file>` paths (simplest; no Astro image
   optimization — acceptable for a personal blog, see §11).
4. Write frontmatter (`title`, `date`, `description`, `draft: false`). Descriptions
   reuse the existing `Articles.astro` copy.
5. The day-of-month for `date` is unknown from Medium's "Sep 2022" granularity; use a
   stable placeholder day (`-01`) — only month/year are displayed.

If a `WebFetch` returns paywalled/partial content, fall back to asking the user for a
Medium export of that single post before proceeding.

## 5. Persona × surface × affordance matrix

One persona only (anonymous visitor — static site, **no authentication**, no
newly-admitted persona).

| Surface | Home (sigil/name→`/`) | Navigate | Socials | Primary content | Back |
|---|---|---|---|---|---|
| `/` (index) | ✓ | articles*(active)*, about | ✓ | article list | n/a |
| `/about` | ✓ | articles, about*(active)* | ✓ | bio | header |
| `/articles/<slug>` | ✓ | articles*(active)*, about | ✓ | post body | header + sigil→home |
| `/rss.xml` | — (machine feed) | — | — | XML | — |
| `404` | ✓ | articles, about | ✓ | not-found + explicit "go home" link | header |

No logout/account affordances apply (no auth). Every human-facing surface reaches
home, nav, and socials through the shared header. No gaps.

**Composition checks:** header rendered fully-assembled per surface — the only
per-surface difference is which nav item carries `.active`; sigil and name are a single
home link (no redundant adjacent home CTAs). **Cross-feature adjacency:** the RSS icon
(new) sits in the social icon group and points to `/rss.xml`; it does not duplicate the
removed "blog" icon (which is deleted, not repurposed).

## 6. Components & responsibilities (isolation)

- **`Layout.astro`** — HTML shell + meta; renders Header/main/Footer. Depends on:
  Header, Footer. Input: `title?`, `description?`, `active?`.
- **`Header.astro`** — brand + nav. Depends on: `SocialLinks`. Input: `active?`.
- **`SocialLinks.astro`** — icon row only. No inputs. Pure presentational.
- **`ArticleList.astro`** — queries `getCollection('articles')`, sorts, draft-filters,
  renders the list. No inputs (self-contained query) — or accepts a pre-fetched array;
  implementation picks one and documents it.
- **`lib/date.ts`** — pure date→string formatters. No Astro deps.
- **`pages/articles/[...slug].astro`** — route + per-post render; depends on collection
  + `prose.css`.

Each unit is understandable and testable in isolation; consumers depend on small,
named interfaces (props / exported functions).

## 7. Error handling & edge cases

- **Empty/zero published articles:** `ArticleList` shows a one-line "No articles yet"
  placeholder rather than an empty list. RSS still builds (empty channel).
- **Draft posts in prod:** excluded from index, routes, and RSS; reachable only in
  `astro dev`.
- **Unknown URL:** Astro renders `404.astro` (static host serves it).
- **Missing image during migration:** build does not fail (absolute public paths);
  caught in the browser walk (§9), fixed before merge.
- **Long titles / subtitles:** wrap; link row reflows; mobile left-aligns.

## 8. Testing & verification

- `npm run build` succeeds (type-checks via `astro/tsconfigs/strict`); zero content
  schema errors.
- Build output contains: `/index.html`, `/about/index.html`,
  `/articles/<slug>/index.html` (×2), `/rss.xml`, `/404.html`, `/sitemap-index.xml`.
- `/rss.xml` is well-formed and lists both posts newest-first.
- No remaining references to deleted `Hero`/`Articles` components or the word "blog"
  in nav/links.

## 9. Browser-walk inventory (walk-only — not provable by build/static review)

Verify in `astro dev` / `astro preview`:

1. Header is byte-for-byte consistent across `/`, `/about`, a post, and `404`; the
   correct nav item is `.active` per route.
2. Brand: sigil square visually spans name+subtitle height; sigil **and** name both
   navigate home.
3. Link row right-aligned on desktop; left-aligns and wraps cleanly `≤560px`.
4. Article list: dates, copper title links, descriptions render and link to the right
   post.
5. Post page: Shiki code highlighting renders on the dark background; images load;
   heading/paragraph rhythm via `prose.css` reads well.
6. Subtle separator + vertical spacing match the approved mockup.
7. RSS feed opens and validates; sitemap includes the new routes.
8. Social icons (incl. RSS → `/rss.xml`, email → mailto) all resolve.

## 10. Open items (non-blocking)

- **Real sigil/wordmark asset** — user will provide an `.svg`. Until then the copper
  monogram placeholder ships. Swap is a single block in `Header.astro` + the OG image.
- **OG image** — interim keeps `avatar.png`; replace with sigil/wordmark `og.png` when
  the asset lands.
- **Exact `date` day** for migrated posts — month/year only are known/displayed.

## 11. Out of scope (YAGNI)

Tags/categories, pagination, full-text search, comments, MDX, reading-time, related
posts, light/dark toggle, view counts, newsletter signup, image optimization pipeline
(absolute public-path images are sufficient).

## 12. Risks

- **Medium → Markdown fidelity** (code blocks, image extraction) — main risk; mitigated
  by manual verification + user-export fallback (§4).
- **Shiki theme legibility** on slate — mitigated by one-line tunable theme + browser
  walk (§9.5).
- **Header regressions across routes** — mitigated by centralizing chrome in `Layout`
  and the per-surface composition check (§5) + walk (§9.1).
