const MAX_SLUG = 50;

export function slugify(title) {
  const full = String(title)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\s_/]+/g, '-')    // separators (space, underscore, slash) -> dash FIRST
    .replace(/[^a-z0-9-]/g, '')  // then strip remaining punctuation
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (full.length <= MAX_SLUG) return full;
  // Cap on a word boundary: keep whole dash-separated words only, so a truncated
  // slug still reads (`...-github-actions`, never `...-github-actions-t`).
  const cut = full.slice(0, MAX_SLUG + 1).lastIndexOf('-');
  return cut > 0 ? full.slice(0, cut) : full.slice(0, MAX_SLUG);
}

export function uniqueSlug(base, existing) {
  const taken = new Set(existing);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export function dateStamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}
