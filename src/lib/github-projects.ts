const existingIds: Record<string, string> = {
  "obsidian-community-plugins": "obsidian-plugins",
  minecraft: "realmglass",
  sites: "elseif-codes",
  "path-notes": "file-tools",
};

type Link = { name: string; href: string };
export type ProjectRow = {
  name: string;
  href?: string;
  repository?: string;
  description: string;
  details?: { text: string; href?: string }[];
  status: string;
  statusLink?: Link;
  release?: Link & { publishedAt: string | null };
  releaseChecked?: boolean;
};
type ProjectGroup = { title?: string; rows: ProjectRow[] };
export type ProfileProject = {
  id: string;
  title: string;
  topic?: string;
  description: string;
  category?: string;
  status: string;
  publication?: { name: string; href?: string };
  curated?: boolean;
  groups: ProjectGroup[];
  links: Link[];
};

// Older versions of the profile listed these plugins as GitHub releases.
const legacyCommunityIds = new Set(["revision-marks", "track-record", "issue-bridge"]);
const categoryLine = /^\*\*Category:\*\* +(.+)$/;
const publicationLine = /^\*\*Publication:\*\* +(.+)$/;
const tableHeader = /^\|\s*(Project|Plugin|Entry)\s*\|\s*What it does\s*\|\s*Status\s*\|$/;
export const markdownLink = /^\[([^\]]+)\]\((https:\/\/[^\s()<>]+)\)$/;

function parseRows(lines: string[], title: string, owner: string)
{
  return lines.map((line) =>
  {
    const cells = line.trim().split("|");
    const [, project, description, status] = cells.map((cell) => cell.trim());
    const link = project?.match(markdownLink);
    if (cells.length !== 5 || cells[0].trim() || cells[4].trim() || !link
      || !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(link[2])
      || !link[2].startsWith(`https://github.com/${owner}/`) || !description || !status) {
      throw new Error(`Invalid row in the ${title} project table: ${line}`);
    }

    const statusLink = status.match(markdownLink);
    if (status.startsWith("[") && !statusLink) {
      throw new Error(`Invalid status link in the ${title} project table: ${status}`);
    }

    return {
      name: link[1], href: link[2], repository: link[2], description, status,
      statusLink: statusLink ? { name: statusLink[1], href: statusLink[2] } : undefined,
    };
  });
}

function parseCuratedRows(lines: string[], title: string): ProjectRow[]
{
  return lines.map((line) =>
  {
    const cells = line.trim().split("|").map((cell) => cell.trim());
    const [, label, description, status] = cells;
    const link = label?.match(markdownLink);
    if (cells.length !== 5 || cells[0] || cells[4] || !label
      || (label.startsWith("[") && !link) || !["-", "Published", "Preview", "Development"].includes(status)) {
      throw new Error(`Invalid row in the ${title} curated list: ${line}`);
    }

    const href = link?.[2];
    const repository = href && /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(href) ? href : undefined;
    return { name: link?.[1] ?? label, href, repository, description, status: status === "-" ? "" : status };
  });
}

function sortProjectRows(rows: ProjectRow[], byRelease: boolean)
{
  const order = ["Published", "Preview", "Development", ""];
  rows.sort((a, b) =>
  {
    const byStatus = order.indexOf(a.status) - order.indexOf(b.status);
    if (byStatus || !byRelease) return byStatus;
    return (b.release?.publishedAt ?? "").localeCompare(a.release?.publishedAt ?? "")
      || a.name.localeCompare(b.name, "en");
  });
}

function normalizeObsidianPlugins(rows: ProjectRow[])
{
  return rows.map((row) =>
  {
    if (row.statusLink?.name === "Published" && /^https:\/\/obsidian\.md\/plugins\?id=[\w-]+$/.test(row.statusLink.href)) {
      return { ...row, status: "Published", href: row.statusLink.href };
    }
    if (row.statusLink?.name === "GitHub release" && row.statusLink.href === `${row.href}/releases/latest`) {
      const id = row.href?.split("/").at(-1)?.replace(/^obsidian-plugin-/, "");
      if (id && legacyCommunityIds.has(id)) {
        const href = `https://obsidian.md/plugins?id=${id}`;
        return { ...row, href, status: "Published", statusLink: { name: "Published", href } };
      }
      return { ...row, status: "Preview", statusLink: undefined };
    }
    if (["Preview", "Test preview", "Development preview"].includes(row.status)) return { ...row, status: "Preview" };
    if (["Development", "In development", "Design stage"].includes(row.status)) return { ...row, status: "Development" };
    throw new Error(`Unknown status for ${row.name}: ${row.status}`);
  });
}

function normalizeProjectRows(rows: ProjectRow[])
{
  return rows.map((row) =>
  {
    if (row.statusLink && ["Live site", "Published"].includes(row.statusLink.name)) {
      return { ...row, status: "Published", statusLink: { ...row.statusLink, name: "Published" } };
    }
    const preview = ["Preview", "Test preview", "Development preview"].includes(row.status)
      || row.statusLink?.name === "GitHub release";
    return { ...row, status: preview ? "Preview" : "Development", statusLink: undefined };
  });
}

export function withProjectRows(project: ProfileProject, rows: ProjectRow[]): ProfileProject
{
  const isObsidian = project.id === "obsidian-plugins" || project.topic === "obsidian-plugin";
  sortProjectRows(rows, isObsidian);
  const publishedCount = isObsidian
    ? rows.filter(({ status }) => status === "Published").length
    : 0;
  const status = project.publication?.name ?? (publishedCount
    ? `${publishedCount} published in the Community directory`
    : Array.from(new Set(rows.map((row) => row.status).filter(Boolean))).join(" · "));
  return { ...project, status, groups: rows.length ? [{ rows }] : [] };
}

export function parseProfile(readme: string, owner = "committed-sins")
{
  const projects: ProfileProject[] = [];
  const ids = new Set<string>();
  const areas = new Map<string, { topic?: string; title: string }>();
  let hasAreaTable = false;

  for (const section of readme.split(/^## /m).slice(1)) {
    const [title, ...lines] = section.trim().split(/\r?\n/);
    const header = lines.findIndex((line) => line.trimStart().startsWith("|"));
    if (title === "Project areas") {
      if (hasAreaTable || header === -1 || lines[header].trim() !== "| Topic | Title | Slug |"
        || !/^\|(?:\s*:?-+:?\s*\|){3}$/.test(lines[header + 1]?.trim() ?? "")) {
        throw new Error("Expected Topic, Title, and Slug columns under Project areas.");
      }
      hasAreaTable = true;
      const usedTopics = new Set<string>();
      for (const line of lines.slice(header + 2)) {
        if (!line.trim()) break;
        const area = line.match(/^\|\s*(-|[a-z0-9]+(?:-[a-z0-9]+)*)\s*\|\s*([^|]+?)\s*\|\s*([a-z0-9]+(?:-[a-z0-9]+)*)\s*\|$/);
        if (!area || !area[2].trim() || areas.has(area[3]) || usedTopics.has(area[1]) || area[3] === "aureka") {
          throw new Error(`Invalid or duplicate project area: ${line}`);
        }
        const [, topic, name, id] = area;
        areas.set(id, { topic: topic === "-" ? undefined : topic, title: name });
        if (topic !== "-") usedTopics.add(topic);
      }
      continue;
    }
    if (header === -1) continue;

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const id = Object.hasOwn(existingIds, slug) ? existingIds[slug] : slug;
    const [separator, ...body] = lines.slice(header + 1);
    const end = body.findIndex((line) => !line.trim());
    const rows = end === -1 ? body : body.slice(0, end);
    const table = lines[header].trim().match(tableHeader);
    if (!id || ids.has(id) || !table || !separator
      || !/^\|(?:\s*:?-+:?\s*\|){3}$/.test(separator.trim()) || rows.length === 0) {
      throw new Error(`Invalid project table in the ${owner} profile: ${title}`);
    }

    const intro = lines.slice(0, header).map((line) => line.trim());
    const category = intro.find((line) => categoryLine.test(line))?.match(categoryLine)?.[1];
    const publicationText = intro.find((line) => publicationLine.test(line))?.match(publicationLine)?.[1];
    const publicationLink = publicationText?.match(markdownLink);
    const publicationName = publicationLink?.[1] ?? publicationText;
    if (publicationName && !["Published", "Preview", "Development"].includes(publicationName)) {
      throw new Error(`Invalid publication status for ${title}: ${publicationName}`);
    }
    const publication = publicationName ? { name: publicationName, href: publicationLink?.[2] } : undefined;
    const description = intro.find((line) => line && !/^[\[>#]/.test(line)
      && !categoryLine.test(line) && !publicationLine.test(line)) ?? "";
    const links = intro.flatMap((line) =>
    {
      const link = line.match(markdownLink);
      return link ? [{ name: link[1], href: link[2] }] : [];
    });
    const curated = table[1] === "Entry";
    let entries: ProjectRow[];
    if (curated) {
      entries = parseCuratedRows(rows, title);
    } else {
      const parsed = parseRows(rows, title, owner);
      entries = id === "obsidian-plugins" ? normalizeObsidianPlugins(parsed) : normalizeProjectRows(parsed);
    }
    projects.push(withProjectRows({ id, title, description, category, publication, curated, status: "", groups: [], links }, entries));
    ids.add(id);
  }

  if (!hasAreaTable) throw new Error(`The ${owner} profile has no Project areas table.`);
  const byId = new Map(projects.map((project) => [project.id, project]));
  for (const [id, { topic }] of areas) {
    if (!topic && !byId.get(id)?.curated) throw new Error(`Project area ${id} must define a topic or a curated Entry table.`);
  }
  return Array.from(areas, ([id, area]) => ({
    description: "", status: "", groups: [], links: [],
    ...byId.get(id), id, ...area,
  }));
}

export async function loadProfileProjects(owner = "committed-sins")
{
  const profileUrl = `https://raw.githubusercontent.com/${owner}/.github/main/profile/README.md`;
  const response = await fetch(profileUrl, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) {
    throw new Error(`Could not fetch the ${owner} profile (HTTP ${response.status}).`);
  }

  return parseProfile(await response.text(), owner);
}
