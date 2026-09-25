/**
 * Fold per-entry editor files into the flat arrays the app imports.
 *
 * The content editor writes one JSON file per announcement or hotline into
 * `src/data/<collection>/`. That shape is right for editing — two people can add
 * posts without colliding on the same file, and a single post can be reverted on
 * its own. It is the wrong shape for the app, which imports
 * `src/data/<collection>.json` as one array and is validated as one array by
 * `pipeline/validate.py`.
 *
 * This script is the seam. It runs before every build, so the array is always
 * derived from the per-entry files rather than hand-edited alongside them —
 * having two writable copies of the same records is how they drift apart.
 *
 * An entry that is missing or malformed stops the build. A news page silently
 * short by one post is worse than a build that says which file is broken.
 */
import { readdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, "../src/data");

/**
 * collection directory -> the array file the app imports.
 *
 * `editorOnly` collections exist only in the editor, so an empty or missing
 * directory means "no posts" and the array is emptied. Without that, deleting
 * the last post leaves it live, because git does not keep an empty directory.
 * Hotlines are also seeded by the pipeline, so a missing directory leaves the
 * committed array alone.
 */
const COLLECTIONS = [
  { collection: "announcements", arrayFile: "announcements.json", editorOnly: true },
  { collection: "hotlines", arrayFile: "hotlines.json", editorOnly: false },
];

/**
 * The editor writes "" for an optional field left blank. The schemas treat a
 * present field as a claim ("url" must be a URL), so blanks are removed rather
 * than validated.
 */
function dropBlanks(value) {
  if (Array.isArray(value)) return value.map(dropBlanks);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== "" && entry !== null && entry !== undefined)
        .map(([key, entry]) => [key, dropBlanks(entry)]),
    );
  }
  return value;
}

/** Newest first for announcements; hotlines keep their urgency order by category. */
const CATEGORY_ORDER = [
  "disaster",
  "police",
  "fire",
  "medical",
  "coastguard",
  "utility",
  "other",
];

function sortFor(collection, records) {
  if (collection === "announcements") {
    return [...records].sort((a, b) =>
      String(b.publishedAt).localeCompare(String(a.publishedAt)),
    );
  }
  if (collection === "hotlines") {
    return [...records].sort((a, b) => {
      const left = CATEGORY_ORDER.indexOf(a.category ?? "other");
      const right = CATEGORY_ORDER.indexOf(b.category ?? "other");
      return left - right || String(a.service).localeCompare(String(b.service));
    });
  }
  return records;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

let folded = 0;

for (const { collection, arrayFile, editorOnly } of COLLECTIONS) {
  const directory = join(dataDir, collection);
  const names = (await exists(directory))
    ? (await readdir(directory)).filter((name) => name.endsWith(".json")).sort()
    : [];

  if (names.length === 0) {
    if (editorOnly) {
      await writeFile(join(dataDir, arrayFile), "[]\n", "utf8");
      console.log(`No ${collection} entries; src/data/${arrayFile} is empty`);
    }
    continue;
  }

  const records = [];
  const ids = new Set();

  for (const name of names) {
    const path = join(directory, name);
    let record;
    try {
      record = JSON.parse(await readFile(path, "utf8"));
    } catch (error) {
      console.error(`${path}: not valid JSON — ${error.message}`);
      process.exit(1);
    }
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      console.error(`${path}: expected a single JSON object`);
      process.exit(1);
    }
    if (!record.id) {
      console.error(`${path}: every entry needs an id`);
      process.exit(1);
    }
    if (ids.has(record.id)) {
      // Ids must be unique across every dataset, not just this one, or
      // validate.py rejects the whole catalog.
      console.error(`${path}: duplicate id ${JSON.stringify(record.id)}`);
      process.exit(1);
    }
    ids.add(record.id);
    records.push(dropBlanks(record));
  }

  const target = join(dataDir, arrayFile);
  const sorted = sortFor(collection, records);
  await writeFile(target, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  console.log(
    `Folded ${records.length} ${collection} entry/entries into src/data/${arrayFile}`,
  );
  folded += records.length;
}

if (folded === 0) {
  console.log("No editor content to fold; the committed arrays are unchanged.");
}
