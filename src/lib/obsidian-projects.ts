import type { ProfileProject, ProjectRow } from "./github-projects";
import { withProjectRows } from "./github-projects.ts";

type Repository = {
  name: string;
  html_url: string;
  description: string | null;
  default_branch: string;
  topics: string[];
  private: boolean;
};
type Release = { tag_name: string; html_url: string; draft: boolean; prerelease: boolean };
type CommunityPlugin = { id: string; name: string; repo: string };

const githubApi = "https://api.github.com";
const directoryUrl = "https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json";

async function fetchList<T>(url: string): Promise<T[]>
{
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const items = await response.json();
  if (!Array.isArray(items)) throw new Error(`Expected a list from ${url}`);
  return items;
}

async function listRepositories()
{
  const repositories: Repository[] = [];
  for (let page = 1; ; page++) {
    const batch = await fetchList<Repository>(`${githubApi}/orgs/committed-sins/repos?type=public&per_page=100&page=${page}`);
    repositories.push(...batch.filter((repo) => !repo.private));
    if (batch.length < 100) return repositories;
  }
}

async function readSummary(repo: Repository)
{
  const branch = repo.default_branch.split("/").map(encodeURIComponent).join("/");
  const url = `https://raw.githubusercontent.com/committed-sins/${repo.name}/refs/heads/${branch}/README.md`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return undefined;

    const readme = await response.text();
    const summary = readme.match(/^## Summary[ \t]*\r?\n(?:[ \t]*\r?\n)*([^\r\n]+(?:\r?\n(?![ \t]*$|#)[^\r\n]+)*)/m);
    return summary?.[1].replace(/\s+/g, " ").trim();
  } catch {
    return undefined;
  }
}

const websiteRepository = "https://github.com/committed-sins/committedsins.dev";

function isBlossomRelease(repository: string, tag: string)
{
  return repository === websiteRepository && /^blossom-[a-f0-9]{40}$/i.test(tag);
}

async function readLatestRelease(repo: Repository)
{
  const pageSize = repo.html_url === websiteRepository ? 100 : 1;
  for (let page = 1; ; page++) {
    const url = `${githubApi}/repos/committed-sins/${repo.name}/releases?per_page=${pageSize}&page=${page}`;
    const releases = await fetchList<Release>(url);
    const release = releases.find(({ draft, tag_name }) => !draft && !isBlossomRelease(repo.html_url, tag_name));
    if (release || releases.length < pageSize) return release;
  }
}

export async function loadTopicProjects(projects: ProfileProject[]): Promise<ProfileProject[]>
{
  const topics = new Set(projects.map(({ topic }) => topic).filter(Boolean));
  if (!topics.size) return projects;

  const [allRepositories, directory] = await Promise.all([
    listRepositories(),
    topics.has("obsidian-plugin") ? fetchList<CommunityPlugin>(directoryUrl) : [],
  ]);
  const repositories = allRepositories.filter(({ topics: repoTopics }) => repoTopics?.some((topic) => topics.has(topic)));
  const listedByRepo = new Map(directory.map((plugin) => [plugin.repo.toLowerCase(), plugin]));
  const metadata = new Map<string, { release?: Release; summary?: string }>();
  for (let start = 0; start < repositories.length; start += 4) {
    await Promise.all(repositories.slice(start, start + 4).map(async (repo) =>
    {
      const [release, summary] = await Promise.all([readLatestRelease(repo), readSummary(repo)]);
      metadata.set(repo.name, { release, summary });
    }));
  }

  return projects.map((profile) =>
  {
    if (!profile.topic) return profile;
    const topic = profile.topic;
    const isObsidian = topic === "obsidian-plugin";
    const previousRows = profile.groups.flatMap((group) => group.rows);
    const previousByRepo = new Map(previousRows.map((row, order) => [row.repository, { row, order }]));
    const groups = repositories.filter((repo) => repo.topics.includes(topic)).map((repo) =>
    {
      const saved = previousByRepo.get(repo.html_url);
      const previous = saved?.row;
      const fullName = `committed-sins/${repo.name}`;
      const plugin = isObsidian ? listedByRepo.get(fullName.toLowerCase()) : undefined;
      const details = metadata.get(repo.name);
      const release = details?.release;
      const directoryLink = plugin ? { name: "Published", href: `https://obsidian.md/plugins?id=${plugin.id}` } : undefined;
      const name = plugin?.name ?? previous?.name ?? repo.name.replace(/^obsidian-plugin-/, "");
      const statusLink = directoryLink ?? (isObsidian ? undefined : previous?.statusLink);
      const published = statusLink || (!isObsidian && release && !release.prerelease);
      const status = published ? "Published" : release ? "Preview" : "Development";
      const row: ProjectRow = {
        name,
        href: directoryLink?.href ?? repo.html_url,
        repository: repo.html_url,
        description: details?.summary || repo.description || previous?.description || "",
        status,
        statusLink,
        release: release ? { name: release.tag_name, href: release.html_url } : undefined,
        releaseChecked: true,
      };
      return { row, order: saved?.order ?? previousRows.length };
    });
    groups.sort((a, b) => a.order - b.order || a.row.name.localeCompare(b.row.name));
    return withProjectRows(profile, groups.map(({ row }) => row));
  });
}
