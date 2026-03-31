import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://fbac.dev',
  output: 'static',
  integrations: [sitemap()],
});
