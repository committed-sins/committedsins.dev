import { getCollection } from "astro:content";
import { loadProfileProjects } from "./github-projects";

let buildProfile: ReturnType<typeof loadProfileProjects> | undefined;

export async function getSiteProjects()
{
  const [localProjects, profileProjects] = await Promise.all([
    getCollection("projects"),
    import.meta.env.DEV ? loadProfileProjects() : (buildProfile ??= loadProfileProjects()),
  ]);

  return [
    ...localProjects.filter(({ data }) => !data.profile)
      .sort((first, second) => first.data.order - second.data.order)
      .map((local) => ({ id: local.id, data: local.data, local, profile: undefined })),
    ...profileProjects.map((profile) =>
    {
      const local = localProjects.find(({ id, data }) => data.profile && id === profile.id);
      return {
        id: profile.id,
        data: {
          title: profile.title,
          description: profile.description || local?.data.description || "",
          category: profile.category ?? local?.data.category ?? "Tools",
          status: profile.status,
        },
        local,
        profile,
      };
    }),
  ];
}
