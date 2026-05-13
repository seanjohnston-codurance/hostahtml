import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseChangelog } from "$lib/changelog";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const markdown = await readFile(resolve(process.cwd(), "..", "CHANGELOG.md"), "utf8");

  return {
    changelog: parseChangelog(markdown),
  };
};
