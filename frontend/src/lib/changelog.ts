export type ChangelogSection = {
  heading: string;
  items: string[];
};

export type ChangelogEntry = {
  date: string;
  displayDate: string;
  sections: ChangelogSection[];
};

export type Changelog = {
  title: string;
  intro: string;
  entries: ChangelogEntry[];
};

export function parseChangelog(markdown: string): Changelog {
  const lines = markdown.split(/\r?\n/);
  const title = readTitle(lines);
  const introLines: string[] = [];
  const entries: ChangelogEntry[] = [];
  let currentEntry: ChangelogEntry | null = null;
  let currentSection: ChangelogSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("# ")) continue;

    if (line.startsWith("## ")) {
      const date = line.slice(3).trim();
      currentEntry = {
        date,
        displayDate: formatHumanUtcDate(date),
        sections: [],
      };
      entries.push(currentEntry);
      currentSection = null;
      continue;
    }

    if (line.startsWith("### ")) {
      if (!currentEntry) continue;
      currentSection = { heading: line.slice(4).trim(), items: [] };
      currentEntry.sections.push(currentSection);
      continue;
    }

    if (line.startsWith("- ")) {
      if (!currentSection) continue;
      currentSection.items.push(line.slice(2).trim());
      continue;
    }

    if (!currentEntry) {
      introLines.push(line);
    }
  }

  return {
    title,
    intro: introLines.join(" "),
    entries,
  };
}

function readTitle(lines: string[]): string {
  const heading = lines.find((line) => line.trim().startsWith("# "));
  return heading ? heading.trim().slice(2).trim() : "Changelog";
}

function formatHumanUtcDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Invalid changelog date: ${date}`);

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const utcDate = new Date(Date.UTC(year, monthIndex, day));

  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== monthIndex ||
    utcDate.getUTCDate() !== day
  ) {
    throw new Error(`Invalid changelog date: ${date}`);
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(utcDate);
}
