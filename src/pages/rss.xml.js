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
