function organization(slug: string, owner: string, title: string, profileEnv: string, business = false)
{
  const home = `/organization/${slug}/`;
  return {
    slug, owner, title, profileEnv, home,
    filename: `organization-${slug}.json`,
    path: `${home}projects/`,
    back: `${home}#projects`,
    overviewBack: business ? "/#company" : "/#other-projects",
    overviewLabel: business ? "Business" : "Others",
  };
}

export const projectDirectories = {
  personal: {
    owner: "committed-sins", filename: "profile-committed-sins.json", path: "/projects/",
    home: "/projects/", back: "/projects/", title: "Projects",
    overviewBack: "/#projects", overviewLabel: "Home", profileEnv: "PROFILE_README_PATH",
  },
  company: organization("aureka-systems", "aurekasystems", "Aureka Systems e.U.", "COMPANY_PROFILE_README_PATH", true),
  xdmz: organization("xdmz-eu", "xdmz-eu", "xDMZ", "XDMZ_PROFILE_README_PATH"),
  limis: organization("limis-at", "limis-at", "LiMiS", "LIMIS_PROFILE_README_PATH"),
  staged: organization("staged", "staged", "StaGeD", "STAGED_PROFILE_README_PATH"),
} as const;

export const otherProjectDirectories = [projectDirectories.xdmz, projectDirectories.limis, projectDirectories.staged];

export const publicProjectsFilename = "projects.json";
export const websiteRepository = "https://github.com/committed-sins/committedsins.dev";
