// Adding items on the Topics tab (spec §4 Topics, F2): several names
// separated by commas, trimmed, without empty values, and without names that
// are already in the list, ignoring case.

/** Collapses inner whitespace, so "black   holes" is the same item as "black holes". */
export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** The key two names are compared by: lowercase, cleaned. */
export function nameKey(name: string): string {
  return cleanName(name).toLocaleLowerCase('en-US');
}

export type ParsedItems = {
  /** New names, in the order typed. The search query of each is the name itself. */
  names: string[];
  /** Names skipped because they were in the list or typed twice. */
  duplicates: number;
};

/** Splits the typed text at commas and keeps only the new names. */
export function parseItemInput(text: string, existingNames: readonly string[]): ParsedItems {
  const taken = new Set(existingNames.map(nameKey));
  const names: string[] = [];
  let duplicates = 0;
  for (const part of text.split(',')) {
    const name = cleanName(part);
    if (name === '') continue;
    const key = nameKey(name);
    if (taken.has(key)) {
      duplicates += 1;
      continue;
    }
    taken.add(key);
    names.push(name);
  }
  return { names, duplicates };
}

/** The short message after Add: how many were added and how many skipped. */
export function describeAddResult(added: number, duplicates: number): string {
  if (added === 0 && duplicates === 0) {
    return 'Type one or more topics, separated by commas.';
  }
  const parts = [`Added ${added} topic${added === 1 ? '' : 's'}.`];
  if (duplicates > 0) {
    parts.push(`Skipped ${duplicates} duplicate${duplicates === 1 ? '' : 's'}.`);
  }
  return parts.join(' ');
}
