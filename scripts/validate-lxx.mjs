import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { LXX_CATALOG } from "./scripture/lxx-catalog.mjs";
import {
  LXX_ALLOWED_OMISSIONS,
  LXX_SOURCE_COMMIT,
} from "./scripture/lxx-source-map.mjs";

const GENERATED_DIRECTORY = path.join(
  process.cwd(),
  "src",
  "data",
  "scripture",
  "generated",
  "lxx",
);
const MANIFEST_PATH = path.join(
  GENERATED_DIRECTORY,
  "manifest.json",
);
const EXPECTED_BOOKS = 55;
const EXPECTED_CHAPTERS = 1136;
const EXPECTED_VERSES = 29244;
const EXPECTED_EMPTY_SOURCE_VERSES = new Set([
  "deuteronomy.25.19",
  "1-kingdoms.13.1",
  "1-kingdoms.18.1",
  "3-kingdoms.3.1",
]);

function fail(message) {
  throw new Error(message);
}

function validReferencePart(value) {
  return (
    (Number.isInteger(value) && value > 0)
    || (typeof value === "string" && /^[a-z0-9]+$/iu.test(value))
  );
}

if (!fs.existsSync(MANIFEST_PATH)) {
  fail("Missing generated LXX manifest.");
}

const manifest = JSON.parse(
  fs.readFileSync(MANIFEST_PATH, "utf8"),
);

if (manifest.schemaVersion !== 1 || manifest.source !== "lxx") {
  fail("Unexpected LXX manifest identity.");
}

if (manifest.sourceVersion !== LXX_SOURCE_COMMIT) {
  fail(
    `Unexpected First1KGreek revision: ${manifest.sourceVersion}`,
  );
}

if (manifest.license !== "CC BY-SA 4.0") {
  fail(`Unexpected LXX license: ${manifest.license}`);
}

if (
  !Array.isArray(manifest.books)
  || manifest.books.length !== EXPECTED_BOOKS
) {
  fail(
    `Expected ${EXPECTED_BOOKS} LXX works; `
      + `found ${manifest.books?.length ?? 0}.`,
  );
}

if (
  manifest.books.map((book) => book.id).join(",")
  !== LXX_CATALOG.map((book) => book.id).join(",")
) {
  fail("The LXX manifest does not match the canonical catalog order.");
}

const expectedOmissions = Object.entries(LXX_ALLOWED_OMISSIONS)
  .map(([workId, omission]) => `${workId}:${omission.book}`)
  .sort();
const actualOmissions = (manifest.omissions ?? [])
  .map((omission) => `${omission.workId}:${omission.book}`)
  .sort();

if (actualOmissions.join(",") !== expectedOmissions.join(",")) {
  fail("The LXX omission record is incomplete.");
}

const verseIds = new Set();
const emptySourceVerseIds = new Set();
let totalChapters = 0;
let totalVerses = 0;

for (const manifestBook of manifest.books) {
  const bookPath = path.join(
    GENERATED_DIRECTORY,
    manifestBook.filename,
  );

  if (!fs.existsSync(bookPath)) {
    fail(`Missing generated LXX file: ${manifestBook.filename}`);
  }

  const bookData = JSON.parse(fs.readFileSync(bookPath, "utf8"));
  if (
    bookData.source?.id !== "lxx"
    || bookData.source?.version !== LXX_SOURCE_COMMIT
    || bookData.source?.license !== "CC BY-SA 4.0"
  ) {
    fail(`Invalid source metadata in ${manifestBook.id}.`);
  }

  if (bookData.book?.id !== manifestBook.id) {
    fail(`Manifest ID mismatch for ${manifestBook.filename}.`);
  }

  if (
    !Array.isArray(bookData.chapters)
    || bookData.chapters.length !== manifestBook.chapters
  ) {
    fail(`Chapter count mismatch in ${manifestBook.id}.`);
  }

  if (
    bookData.chapters.map((chapter) => String(chapter.number)).join(",")
    !== manifestBook.chapterNumbers.map(String).join(",")
  ) {
    fail(`Chapter labels do not match in ${manifestBook.id}.`);
  }

  let bookVerseCount = 0;

  for (const chapter of bookData.chapters) {
    if (!validReferencePart(chapter.number)) {
      fail(
        `Invalid chapter label in ${manifestBook.id}: ${chapter.number}`,
      );
    }

    if (!Array.isArray(chapter.verses) || chapter.verses.length === 0) {
      fail(
        `Missing verses in ${manifestBook.id} ${chapter.number}.`,
      );
    }

    for (const verse of chapter.verses) {
      if (!validReferencePart(verse.number)) {
        fail(`Invalid verse label at ${verse.id}.`);
      }

      const expectedId =
        `${manifestBook.id}.${chapter.number}.${verse.number}`;

      if (verse.id !== expectedId) {
        fail(
          `Invalid verse ID: expected ${expectedId}; found ${verse.id}.`,
        );
      }

      if (String(verse.chapter) !== String(chapter.number)) {
        fail(`Chapter mismatch at ${verse.id}.`);
      }

      if (
        typeof verse.sourceText !== "string"
        || verse.sourceText.length === 0
        || typeof verse.displayText !== "string"
        || verse.displayText.length === 0
      ) {
        fail(`Missing readable text at ${verse.id}.`);
      }

      if (verseIds.has(verse.id)) {
        fail(`Duplicate LXX verse ID: ${verse.id}.`);
      }

      verseIds.add(verse.id);
      bookVerseCount += 1;
    }
  }

  if (bookVerseCount !== manifestBook.verses) {
    fail(`Verse count mismatch in ${manifestBook.id}.`);
  }

  for (const verseId of manifestBook.emptySourceVerseIds ?? []) {
    emptySourceVerseIds.add(verseId);
  }

  totalChapters += bookData.chapters.length;
  totalVerses += bookVerseCount;
}

if (
  totalChapters !== EXPECTED_CHAPTERS
  || totalVerses !== EXPECTED_VERSES
) {
  fail(
    `Expected ${EXPECTED_CHAPTERS} chapters / ${EXPECTED_VERSES} verses; `
      + `found ${totalChapters} / ${totalVerses}.`,
  );
}

if (
  [...emptySourceVerseIds].sort().join(",")
  !== [...EXPECTED_EMPTY_SOURCE_VERSES].sort().join(",")
) {
  fail("The known empty source-verse record changed.");
}

const psalms = manifest.books.find((book) => book.id === "psalms");
if (psalms?.chapterNumbers.at(-1) !== 151) {
  fail("The complete 151-Psalm source is not represented.");
}

console.log("=== LXX VALIDATION COMPLETE ===");
console.log(`Works: ${manifest.books.length}`);
console.log(`Chapters: ${totalChapters}`);
console.log(`Verses: ${totalVerses}`);
console.log(`Unique verse IDs: ${verseIds.size}`);
console.log(`Permitted omissions: ${manifest.omissions.length}`);
