import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async ({ site }) =>
{
  if (!site) {
    throw new Error("The RSS feed requires Astro's site URL.");
  }

  const articles = await getCollection("writing", ({ data }) => !data.draft);
  articles.sort((first, second) => second.data.published.getTime() - first.data.published.getTime());

  return rss({
    title: "Committed Sins",
    description: "Occasional writing from Committed Sins.",
    site,
    customData: "<language>en</language>",
    items: articles.map(({ id, data }) => ({
      title: data.title,
      description: data.description,
      pubDate: data.published,
      link: `/writing/${id}/`,
    })),
  });
};
