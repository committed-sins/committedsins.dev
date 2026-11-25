const profileUrl = "https://raw.githubusercontent.com/committed-sins/.github/main/profile/README.md";

const existingIds: Record<string, string> = {
  "obsidian-community-plugins": "obsidian-plugins",
  minecraft: "realmglass",
  sites: "elseif-codes",
  "path-notes": "file-tools",
};

type Link = { name: string; href: string };
type ProjectRow = Link & { description: string; status: string; statusLink?: Link };
type ProjectGroup = { title?: string; rows: ProjectRow[] };
export type ProfileProject = {
  id: string;
  title: string;
  description: string;
  category?: string;
  status: string;
  groups: ProjectGroup[];
  links: Link[];
};

// Older versions of the profile listed these plugins as GitHub releases.
const legacyCommunityIds = new Set(["revision-marks", "track-record", "issue-bridge"]);
const communityDirectory = "Community directory";
const categoryLine = /^\*\*Category:\*\* +(.+)$/;
const tableHeader = /^\|\s*(?:Project|Plugin)\s*\|\s*What it does\s*\|\s*Status\s*\|$/;
const markdownLink = /^\[([^\]]+)\]\((https:\/\/[^\s()<>]+)\)$/;

function parseRows(lines: string[], title: string)
{
  return lines.map((line) =>
  {
    const cells = line.trim().split("|");
    const [, project, description, status] = cells.map((cell) => cell.trim());
    const link = project?.match(markdownLink);
    if (cells.length !== 5 || cells[0].trim() || cells[4].trim() || !link
      || !/^https:\/\/github\.com\/committed-sins\/[\w.-]+$/.test(link[2]) || !description || !status) {
      throw new Error(`Invalid row in the ${title} project table: ${line}`);
    }

    const statusLink = status.match(markdownLink);
    if (status.startsWith("[") && !statusLink) {
      throw new Error(`Invalid status link in the ${title} project table: ${status}`);
    }

    return {
      name: link[1], href: link[2], description, status,
      statusLink: statusLink ? { name: statusLink[1], href: statusLink[2] } : undefined,
    };
  });
}

function groupObsidianPlugins(rows: ProjectRow[])
{
  const community: ProjectGroup = { title: communityDirectory, rows: [] };
  const releases: ProjectGroup = { title: "GitHub releases", rows: [] };
  const development: ProjectGroup = { title: "In development", rows: [] };
  const design: ProjectGroup = { title: "Design stage", rows: [] };

  for (const row of rows) {
    if (row.statusLink?.name === "Published" && /^https:\/\/obsidian\.md\/plugins\?id=[\w-]+$/.test(row.statusLink.href)) {
      community.rows.push({ ...row, href: row.statusLink.href });
    } else if (row.statusLink?.name === "GitHub release" && row.statusLink.href === `${row.href}/releases/latest`) {
      const id = row.href.split("/").at(-1)?.replace(/^obsidian-plugin-/, "");
      if (id && legacyCommunityIds.has(id)) {
        community.rows.push({ ...row, href: `https://obsidian.md/plugins?id=${id}` });
      } else {
        releases.rows.push({ ...row, href: row.statusLink.href });
      }
    } else if (["Test preview", "Development preview", "In development"].includes(row.status)) {
      development.rows.push(row);
    } else if (row.status === "Design stage") {
      design.rows.push(row);
    } else {
      throw new Error(`Unknown status for ${row.name}: ${row.status}`);
    }
  }

  return [community, releases, development, design].filter((group) => group.rows.length > 0);
}

function parseProfile(readme: string)
{
  const projects: ProfileProject[] = [];
  const ids = new Set<string>();

  for (const section of readme.split(/^## /m).slice(1)) {
    const [title, ...lines] = section.trim().split(/\r?\n/);
    const header = lines.findIndex((line) => line.trimStart().startsWith("|"));
    if (header === -1) continue;

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const id = Object.hasOwn(existingIds, slug) ? existingIds[slug] : slug;
    const [separator, ...body] = lines.slice(header + 1);
    const end = body.findIndex((line) => !line.trim());
    const rows = end === -1 ? body : body.slice(0, end);
    if (!id || ids.has(id) || !tableHeader.test(lines[header].trim()) || !separator
      || !/^\|(?:\s*:?-+:?\s*\|){3}$/.test(separator.trim()) || rows.length === 0) {
      throw new Error(`Invalid project table in the Committed Sins profile: ${title}`);
    }

    const intro = lines.slice(0, header).map((line) => line.trim());
    const category = intro.find((line) => categoryLine.test(line))?.match(categoryLine)?.[1];
    const description = intro.find((line) => line && !/^[\[>#]/.test(line) && !categoryLine.test(line)) ?? "";
    const links = intro.flatMap((line) =>
    {
      const link = line.match(markdownLink);
      return link ? [{ name: link[1], href: link[2] }] : [];
    });
    const entries = parseRows(rows, title);
    const groups = id === "obsidian-plugins" ? groupObsidianPlugins(entries) : [{ rows: entries }];
    const publishedCount = groups.find((group) => group.title === communityDirectory)?.rows.length;
    const status = publishedCount
      ? `${publishedCount} published in the Community directory`
      : Array.from(new Set(entries.map((entry) => entry.statusLink?.name ?? entry.status))).join(" · ");
    projects.push({ id, title, description, category, status, groups, links });
    ids.add(id);
  }

  if (projects.length === 0) throw new Error("The Committed Sins profile contains no project tables.");
  return projects;
}

export async function loadProfileProjects()
{
  const response = await fetch(profileUrl, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) {
    throw new Error(`Could not fetch the Committed Sins profile (HTTP ${response.status}).`);
  }

  return parseProfile(await response.text());
}
