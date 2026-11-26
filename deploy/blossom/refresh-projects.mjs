import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadProfileProjects, parseProfile } from "../../src/lib/github-projects.ts";
import { loadProjectRepositories } from "../../src/lib/project-repositories.ts";
import { projectDirectories } from "../../src/lib/project-directories.ts";

const directory = process.argv[2];
if (!directory) throw new Error("Pass the project snapshot output directory.");

async function refresh(owner, filename, localPath)
{
  const profile = localPath ? parseProfile(await readFile(localPath, "utf8"), owner) : await loadProfileProjects(owner);
  const projects = await loadProjectRepositories(profile, owner);
  const pending = join(directory, `.${filename}.${process.pid}`);
  try {
    await writeFile(pending, JSON.stringify(projects) + "\n", { flag: "wx" });
    await rename(pending, join(directory, filename));
  } finally {
    await rm(pending, { force: true });
  }
  console.log(`Refreshed ${projects.length} project areas for ${owner}.`);
}

await mkdir(directory, { recursive: true });
const results = await Promise.allSettled(Object.values(projectDirectories).map(({ owner, filename, profileEnv }) =>
  refresh(owner, filename, process.env[profileEnv])));
for (const result of results) {
  if (result.status === "rejected") {
    console.error(result.reason);
    process.exitCode = 1;
  }
}
