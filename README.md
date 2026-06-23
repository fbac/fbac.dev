# fbac.dev

Personal portfolio. Built with [Astro](https://astro.build/).

## Development

```bash
npm install
npm run dev
```

## Writing articles

```bash
npm run new "My Article Title"
```

Creates `src/content/articles/<slug>.md` with frontmatter stamped to today's date and `draft: true`. Drafts are excluded from production builds and RSS. Fill in the `description`, write the body, and set `draft: false` to publish.

## Deploy

Push to `main`. GitHub Actions handles the rest.
