import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadProfileProjects, parseProfile } from "../../src/lib/github-projects.ts";
import { loadTopicProjects } from "../../src/lib/obsidian-projects.ts";

const directory = process.argv[2];
if (!directory) throw new Error("Pass the project snapshot output directory.");

const localPath = process.env.PROFILE_README_PATH;
const profile = localPath ? parseProfile(await readFile(localPath, "utf8")) : await loadProfileProjects();
const projects = (await loadTopicProjects(profile)).filter(({ topic }) => topic);
if (!projects.length) throw new Error("No project areas found.");

await mkdir(directory, { recursive: true });
const pending = join(directory, `.projects.${process.pid}.json`);
try {
  await writeFile(pending, JSON.stringify(projects) + "\n", { flag: "wx" });
  await rename(pending, join(directory, "projects.json"));
} finally {
  await rm(pending, { force: true });
}
console.log(`Refreshed ${projects.length} project areas.`);
