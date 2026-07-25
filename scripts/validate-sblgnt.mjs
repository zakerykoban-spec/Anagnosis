import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const generatedDirectory = path.join(
  root,
  "src",
  "data",
  "scripture",
  "generated",
  "sblgnt",
);

const manifestPath = path.join(
  generatedDirectory,
  "manifest.json",
);

function fail(message) {
  throw new Error(message);
}

if (!fs.existsSync(manifestPath)) {
  fail("Missing generated SBLGNT manifest.");
}

const manifest = JSON.parse(
  fs.readFileSync(manifestPath, "utf8"),
);

if (manifest.schemaVersion !== 1) {
  fail(
    `Unexpected manifest schema version: ${manifest.schemaVersion}`,
  );
}

if (manifest.source !== "sblgnt") {
  fail(`Unexpected Scripture source: ${manifest.source}`);
}

if (manifest.sourceVersion !== "1.2") {
  fail(
    `Unexpected SBLGNT version: ${manifest.sourceVersion}`,
  );
}

if (
  !Array.isArray(manifest.books) ||
  manifest.books.length !== 27
) {
  fail(
    `Expected 27 books; found ${manifest.books?.length ?? 0}.`,
  );
}

const verseIds = new Set();
let totalChapters = 0;
let totalVerses = 0;

for (const manifestBook of manifest.books) {
  const bookPath = path.join(
    generatedDirectory,
    manifestBook.filename,
  );

  if (!fs.existsSync(bookPath)) {
    fail(
      `Missing generated book file: ${manifestBook.filename}`,
    );
  }

  const bookData = JSON.parse(
    fs.readFileSync(bookPath, "utf8"),
  );

  if (bookData.book.id !== manifestBook.id) {
    fail(
      `Manifest ID mismatch for ${manifestBook.filename}`,
    );
  }

  if (!Array.isArray(bookData.chapters)) {
    fail(
      `Book contains no chapter array: ${manifestBook.id}`,
    );
  }

  if (
    bookData.chapters.length !== manifestBook.chapters
  ) {
    fail(
      `Chapter count mismatch in ${manifestBook.id}`,
    );
  }

  let bookVerseCount = 0;

  for (const chapter of bookData.chapters) {
    if (
      !Number.isInteger(chapter.number) ||
      chapter.number < 1
    ) {
      fail(
        `Invalid chapter number in ${manifestBook.id}`,
      );
    }

    if (!Array.isArray(chapter.verses)) {
      fail(
        `Missing verse array in ${manifestBook.id} ${chapter.number}`,
      );
    }

    for (const verse of chapter.verses) {
      const expectedId =
        `${manifestBook.id}.${chapter.number}.${verse.number}`;

      if (verse.id !== expectedId) {
        fail(
          `Invalid verse ID: expected ${expectedId}; found ${verse.id}`,
        );
      }

      if (verse.chapter !== chapter.number) {
        fail(`Chapter mismatch at ${verse.id}`);
      }

      if (
        !Number.isInteger(verse.number) ||
        verse.number < 1
      ) {
        fail(`Invalid verse number at ${verse.id}`);
      }

      if (
        typeof verse.sourceText !== "string" ||
        verse.sourceText.length === 0
      ) {
        fail(`Missing source text at ${verse.id}`);
      }

      if (
        typeof verse.displayText !== "string" ||
        verse.displayText.length === 0
      ) {
        fail(`Missing display text at ${verse.id}`);
      }

      if (verseIds.has(verse.id)) {
        fail(`Duplicate verse ID: ${verse.id}`);
      }

      verseIds.add(verse.id);
      bookVerseCount += 1;
    }
  }

  if (bookVerseCount !== manifestBook.verses) {
    fail(
      `Verse count mismatch in ${manifestBook.id}`,
    );
  }

  totalChapters += bookData.chapters.length;
  totalVerses += bookVerseCount;
}

if (totalChapters !== 260) {
  fail(
    `Expected 260 chapters; found ${totalChapters}.`,
  );
}

if (totalVerses !== 7939) {
  fail(
    `Expected 7939 verses; found ${totalVerses}.`,
  );
}

console.log("=== SBLGNT VALIDATION COMPLETE ===");
console.log(`Books: ${manifest.books.length}`);
console.log(`Chapters: ${totalChapters}`);
console.log(`Verses: ${totalVerses}`);
console.log(`Unique verse IDs: ${verseIds.size}`);
