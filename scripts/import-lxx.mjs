import { execFileSync } from "node:child_process";
import {
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { SaxesParser } from "saxes";
import { LXX_CATALOG } from "./scripture/lxx-catalog.mjs";
import {
  LXX_ALLOWED_OMISSIONS,
  LXX_SOURCE_COMMIT,
  LXX_SOURCE_REPOSITORY,
  LXX_SOURCE_ROOT,
  LXX_SOURCE_URL,
  resolveLxxSourceFile,
} from "./scripture/lxx-source-map.mjs";

const OUTPUT_ROOT = "src/data/scripture/generated/lxx";
const TEI_NAMESPACE = "http://www.tei-c.org/ns/1.0";
const OMITTED_ELEMENTS = new Set(["fw", "head", "note", "pb"]);
const SPACING_ELEMENTS = new Set(["lb", "milestone"]);

function attribute(tag, name) {
  return (
    Object.values(tag.attributes).find(
      (candidate) => candidate.local === name,
    )?.value ?? null
  );
}

function normalizeReferencePart(value, fallback) {
  const resolved = value?.trim() || fallback;
  return /^\d+$/u.test(resolved) ? Number.parseInt(resolved, 10) : resolved;
}

function normalizeText(parts) {
  return parts
    .join("")
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/gu, "")
    .replace(/\s+/gu, " ")
    .replace(/\s+([,.;··!?])/gu, "$1")
    .trim();
}

function parseBook(xml, catalogBook, sourceFile) {
  const parser = new SaxesParser({ xmlns: true });
  const chapters = [];
  const chapterByKey = new Map();
  const verseIds = new Set();
  const emptySourceVerseIds = [];

  let depth = 0;
  let currentChapter = null;
  let chapterDepth = null;
  let activeVerse = null;
  let ignoredVerseDepth = null;
  let omittedDepth = 0;

  function ensureChapter(number) {
    const key = String(number);
    const existing = chapterByKey.get(key);
    if (existing) return existing;

    const chapter = { number, verses: [] };
    chapters.push(chapter);
    chapterByKey.set(key, chapter);
    return chapter;
  }

  function finishVerse() {
    const chapterNumber = activeVerse.chapter;
    const verseNumber = activeVerse.number;
    const text = normalizeText(activeVerse.text);
    const id =
      `${catalogBook.id}.${String(chapterNumber)}.${String(verseNumber)}`;

    if (!text) {
      emptySourceVerseIds.push(id);
      activeVerse = null;
      omittedDepth = 0;
      return;
    }

    if (verseIds.has(id)) {
      throw new Error(`${sourceFile} contains a duplicate verse ID: ${id}.`);
    }

    verseIds.add(id);
    ensureChapter(chapterNumber).verses.push({
      id,
      chapter: chapterNumber,
      number: verseNumber,
      sourceText: text,
      displayText: text,
    });
    activeVerse = null;
    omittedDepth = 0;
  }

  parser.on("opentag", (tag) => {
    depth += 1;

    if (tag.uri !== TEI_NAMESPACE) return;

    if (ignoredVerseDepth !== null) return;

    if (
      tag.local === "div"
      && attribute(tag, "subtype") === "chapter"
    ) {
      currentChapter = normalizeReferencePart(
        attribute(tag, "n"),
        String(chapters.length + 1),
      );
      chapterDepth = depth;
      return;
    }

    if (
      tag.local === "div"
      && attribute(tag, "subtype") === "verse"
    ) {
      const rawVerseNumber = attribute(tag, "n");

      if (rawVerseNumber === "head") {
        ignoredVerseDepth = depth;
        return;
      }

      activeVerse = {
        depth,
        chapter: currentChapter ?? 1,
        number: normalizeReferencePart(
          rawVerseNumber,
          String((chapterByKey.get(String(currentChapter ?? 1))?.verses.length ?? 0) + 1),
        ),
        text: [],
      };
      omittedDepth = 0;
      return;
    }

    if (!activeVerse) return;

    if (omittedDepth > 0) {
      omittedDepth += 1;
      return;
    }

    if (OMITTED_ELEMENTS.has(tag.local)) {
      omittedDepth = 1;
      return;
    }

    if (SPACING_ELEMENTS.has(tag.local)) {
      activeVerse.text.push(" ");
    }
  });

  parser.on("text", (text) => {
    if (activeVerse && omittedDepth === 0) {
      activeVerse.text.push(text);
    }
  });

  parser.on("cdata", (text) => {
    if (activeVerse && omittedDepth === 0) {
      activeVerse.text.push(text);
    }
  });

  parser.on("closetag", () => {
    if (ignoredVerseDepth === depth) {
      ignoredVerseDepth = null;
    } else if (activeVerse && activeVerse.depth === depth) {
      finishVerse();
    } else if (activeVerse && omittedDepth > 0) {
      omittedDepth -= 1;
    }

    if (chapterDepth === depth) {
      currentChapter = null;
      chapterDepth = null;
    }

    depth -= 1;
  });

  parser.write(xml).close();

  if (activeVerse) {
    throw new Error(`${sourceFile} ended inside a verse.`);
  }

  if (chapters.length === 0 || verseIds.size === 0) {
    throw new Error(`${sourceFile} did not produce readable Scripture data.`);
  }

  return {
    chapters,
    verseCount: verseIds.size,
    emptySourceVerseIds,
  };
}

function sourceRevision() {
  return execFileSync(
    "git",
    ["-C", LXX_SOURCE_REPOSITORY, "rev-parse", "HEAD"],
    { encoding: "utf8" },
  ).trim();
}

async function main() {
  const revision = sourceRevision();
  if (revision !== LXX_SOURCE_COMMIT) {
    throw new Error(
      `Expected First1KGreek ${LXX_SOURCE_COMMIT}, found ${revision}.`,
    );
  }

  const availableWorkIds = (await readdir(
    LXX_SOURCE_ROOT,
    { withFileTypes: true },
  ))
    .filter(
      (entry) =>
        entry.isDirectory() && /^tlg\d+$/u.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort();

  const configuredWorkIds = new Set([
    ...LXX_CATALOG.map((book) => book.workId),
    ...Object.keys(LXX_ALLOWED_OMISSIONS),
  ]);
  const unexpectedWorkIds = availableWorkIds.filter(
    (workId) => !configuredWorkIds.has(workId),
  );

  if (unexpectedWorkIds.length > 0) {
    throw new Error(
      `Unconfigured LXX works found: ${unexpectedWorkIds.join(", ")}`,
    );
  }

  await rm(OUTPUT_ROOT, { recursive: true, force: true });
  await mkdir(OUTPUT_ROOT, { recursive: true });

  const manifestBooks = [];

  for (const [index, catalogBook] of LXX_CATALOG.entries()) {
    const workRoot = path.join(LXX_SOURCE_ROOT, catalogBook.workId);
    const availableFiles = await readdir(workRoot);
    const sourceFile = resolveLxxSourceFile(
      catalogBook.workId,
      availableFiles,
    );

    if (!sourceFile) {
      throw new Error(
        `Cataloged LXX work was unexpectedly omitted: ${catalogBook.workId}`,
      );
    }

    const xml = await readFile(
      path.join(workRoot, sourceFile),
      "utf8",
    );
    const parsed = parseBook(xml, catalogBook, sourceFile);
    const filename = `${catalogBook.id}.json`;
    const book = {
      schemaVersion: 1,
      source: {
        id: "lxx",
        edition: "First1KGreek Septuagint collection",
        version: LXX_SOURCE_COMMIT,
        editor: "OpenGreekAndLatin digital editions",
        license: "CC BY-SA 4.0",
        transformed: true,
      },
      book: {
        id: catalogBook.id,
        code: catalogBook.code,
        order: index + 1,
        titleGreek: catalogBook.titleGreek,
        sourceHeading: catalogBook.titleEnglish,
        workId: catalogBook.workId,
        sourceFile,
      },
      chapters: parsed.chapters,
    };

    await writeFile(
      path.join(OUTPUT_ROOT, filename),
      `${JSON.stringify(book, null, 2)}\n`,
      "utf8",
    );

    manifestBooks.push({
      id: catalogBook.id,
      code: catalogBook.code,
      order: index + 1,
      titleGreek: catalogBook.titleGreek,
      titleEnglish: catalogBook.titleEnglish,
      filename,
      workId: catalogBook.workId,
      sourceFile,
      chapterNumbers: parsed.chapters.map((chapter) => chapter.number),
      chapters: parsed.chapters.length,
      verses: parsed.verseCount,
      emptySourceVerseIds: parsed.emptySourceVerseIds,
    });
  }

  const omissions = Object.entries(LXX_ALLOWED_OMISSIONS).map(
    ([workId, omission]) => ({ workId, ...omission }),
  );
  const manifest = {
    schemaVersion: 1,
    source: "lxx",
    sourceVersion: LXX_SOURCE_COMMIT,
    sourceUrl: LXX_SOURCE_URL,
    license: "CC BY-SA 4.0",
    transformed: true,
    books: manifestBooks,
    omissions,
  };

  await writeFile(
    path.join(OUTPUT_ROOT, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  const totalVerses = manifestBooks.reduce(
    (total, book) => total + book.verses,
    0,
  );
  console.log(
    `Imported ${manifestBooks.length} LXX works, `
      + `${manifestBooks.reduce((total, book) => total + book.chapters, 0)} chapters, `
      + `${totalVerses} verses.`,
  );
  console.log(
    `Recorded ${omissions.length} permitted omission: `
      + omissions.map((omission) => omission.book).join(", "),
  );
}

await main();
