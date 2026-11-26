export const projectDirectories = {
  personal: {
    owner: "committed-sins", filename: "projects.json", path: "/projects/",
    back: "/#projects", profileEnv: "PROFILE_README_PATH",
  },
  company: {
    owner: "aurekasystems", filename: "company-projects.json", path: "/company/projects/",
    back: "/company/#projects", profileEnv: "COMPANY_PROFILE_README_PATH",
  },
  xdmz: {
    owner: "xdmz-eu", filename: "xdmz-projects.json", path: "/other-projects/xdmz/",
    back: "/#other-projects", profileEnv: "XDMZ_PROFILE_README_PATH", title: "xDMZ",
  },
  limis: {
    owner: "limis-at", filename: "limis-projects.json", path: "/other-projects/limis/",
    back: "/#other-projects", profileEnv: "LIMIS_PROFILE_README_PATH", title: "LiMiS",
  },
  staged: {
    owner: "staged", filename: "staged-projects.json", path: "/other-projects/staged/",
    back: "/#other-projects", profileEnv: "STAGED_PROFILE_README_PATH", title: "StaGeD",
  },
} as const;

export const otherProjectDirectories = [projectDirectories.xdmz, projectDirectories.limis, projectDirectories.staged];

export const websiteRepository = "https://github.com/committed-sins/committedsins.dev";
