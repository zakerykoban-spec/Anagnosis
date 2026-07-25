import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const inputDirectory = path.join(
  root,
  "imports",
  "scripture",
  "sblgnt",
  "data",
  "sblgnt",
  "text",
);

const outputDirectory = path.join(
  root,
  "src",
  "data",
  "scripture",
  "generated",
  "sblgnt",
);

const books = [
  { order: 1, file: "Matt.txt", id: "matthew", code: "Matt", titleGreek: "Κατὰ Ματθαῖον" },
  { order: 2, file: "Mark.txt", id: "mark", code: "Mark", titleGreek: "Κατὰ Μᾶρκον" },
  { order: 3, file: "Luke.txt", id: "luke", code: "Luke", titleGreek: "Κατὰ Λουκᾶν" },
  { order: 4, file: "John.txt", id: "john", code: "John", titleGreek: "Κατὰ Ἰωάννην" },
  { order: 5, file: "Acts.txt", id: "acts", code: "Acts", titleGreek: "Πράξεις Ἀποστόλων" },
  { order: 6, file: "Rom.txt", id: "romans", code: "Rom", titleGreek: "Πρὸς Ῥωμαίους" },
  { order: 7, file: "1Cor.txt", id: "1-corinthians", code: "1Cor", titleGreek: "Πρὸς Κορινθίους Αʹ" },
  { order: 8, file: "2Cor.txt", id: "2-corinthians", code: "2Cor", titleGreek: "Πρὸς Κορινθίους Βʹ" },
  { order: 9, file: "Gal.txt", id: "galatians", code: "Gal", titleGreek: "Πρὸς Γαλάτας" },
  { order: 10, file: "Eph.txt", id: "ephesians", code: "Eph", titleGreek: "Πρὸς Ἐφεσίους" },
  { order: 11, file: "Phil.txt", id: "philippians", code: "Phil", titleGreek: "Πρὸς Φιλιππησίους" },
  { order: 12, file: "Col.txt", id: "colossians", code: "Col", titleGreek: "Πρὸς Κολοσσαεῖς" },
  { order: 13, file: "1Thess.txt", id: "1-thessalonians", code: "1Thess", titleGreek: "Πρὸς Θεσσαλονικεῖς Αʹ" },
  { order: 14, file: "2Thess.txt", id: "2-thessalonians", code: "2Thess", titleGreek: "Πρὸς Θεσσαλονικεῖς Βʹ" },
  { order: 15, file: "1Tim.txt", id: "1-timothy", code: "1Tim", titleGreek: "Πρὸς Τιμόθεον Αʹ" },
  { order: 16, file: "2Tim.txt", id: "2-timothy", code: "2Tim", titleGreek: "Πρὸς Τιμόθεον Βʹ" },
  { order: 17, file: "Titus.txt", id: "titus", code: "Titus", titleGreek: "Πρὸς Τίτον" },
  { order: 18, file: "Phlm.txt", id: "philemon", code: "Phlm", titleGreek: "Πρὸς Φιλήμονα" },
  { order: 19, file: "Heb.txt", id: "hebrews", code: "Heb", titleGreek: "Πρὸς Ἑβραίους" },
  { order: 20, file: "Jas.txt", id: "james", code: "Jas", titleGreek: "Ἰακώβου" },
  { order: 21, file: "1Pet.txt", id: "1-peter", code: "1Pet", titleGreek: "Πέτρου Αʹ" },
  { order: 22, file: "2Pet.txt", id: "2-peter", code: "2Pet", titleGreek: "Πέτρου Βʹ" },
  { order: 23, file: "1John.txt", id: "1-john", code: "1John", titleGreek: "Ἰωάννου Αʹ" },
  { order: 24, file: "2John.txt", id: "2-john", code: "2John", titleGreek: "Ἰωάννου Βʹ" },
  { order: 25, file: "3John.txt", id: "3-john", code: "3John", titleGreek: "Ἰωάννου Γʹ" },
  { order: 26, file: "Jude.txt", id: "jude", code: "Jude", titleGreek: "Ἰούδα" },
  { order: 27, file: "Rev.txt", id: "revelation", code: "Rev", titleGreek: "Ἀποκάλυψις Ἰωάννου" },
];

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/gu, " ").trim();
}

function createDisplayText(sourceText) {
  return sourceText
    .replace(/[⸀⸂⸃]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function parseBook(book) {
  const inputPath = path.join(inputDirectory, book.file);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Missing SBLGNT source file: ${inputPath}`);
  }

  const rawText = fs
    .readFileSync(inputPath, "utf8")
    .replace(/^\uFEFF/u, "")
    .normalize("NFC");

  const referencePattern = new RegExp(
    `${escapeRegularExpression(book.code)}\\s+(\\d+):(\\d+)\\s+`,
    "gu",
  );

  const matches = [...rawText.matchAll(referencePattern)];

  if (matches.length === 0) {
    throw new Error(`No verse references found in ${book.file}`);
  }

  const sourceHeading = normalizeWhitespace(
    rawText.slice(0, matches[0].index),
  );

  const chapters = new Map();

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const nextMatch = matches[index + 1];

    const chapterNumber = Number.parseInt(match[1], 10);
    const verseNumber = Number.parseInt(match[2], 10);

    const textStart = match.index + match[0].length;
    const textEnd = nextMatch ? nextMatch.index : rawText.length;

    const sourceText = normalizeWhitespace(
      rawText.slice(textStart, textEnd),
    );

    if (!sourceText) {
      throw new Error(
        `Empty verse found at ${book.code} ${chapterNumber}:${verseNumber}`,
      );
    }

    if (!chapters.has(chapterNumber)) {
      chapters.set(chapterNumber, []);
    }

    chapters.get(chapterNumber).push({
      id: `${book.id}.${chapterNumber}.${verseNumber}`,
      chapter: chapterNumber,
      number: verseNumber,
      sourceText,
      displayText: createDisplayText(sourceText),
    });
  }

  const chapterData = [...chapters.entries()]
    .sort(([left], [right]) => left - right)
    .map(([number, verses]) => ({
      number,
      verses,
    }));

  return {
    schemaVersion: 1,
    source: {
      id: "sblgnt",
      edition: "The Greek New Testament: SBL Edition",
      version: "1.2",
      editor: "Michael W. Holmes",
      license: "CC BY 4.0",
      transformed: true,
    },
    book: {
      id: book.id,
      code: book.code,
      order: book.order,
      titleGreek: book.titleGreek,
      sourceHeading,
    },
    chapters: chapterData,
  };
}

function countVerses(bookData) {
  return bookData.chapters.reduce(
    (total, chapter) => total + chapter.verses.length,
    0,
  );
}

fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.mkdirSync(outputDirectory, { recursive: true });

const manifest = {
  schemaVersion: 1,
  source: "sblgnt",
  sourceVersion: "1.2",
  books: [],
};

for (const book of books) {
  const bookData = parseBook(book);
  const outputFilename = `${book.id}.json`;
  const outputPath = path.join(outputDirectory, outputFilename);

  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(bookData, null, 2)}\n`,
    "utf8",
  );

  manifest.books.push({
    id: book.id,
    code: book.code,
    order: book.order,
    titleGreek: book.titleGreek,
    filename: outputFilename,
    chapters: bookData.chapters.length,
    verses: countVerses(bookData),
  });
}

fs.writeFileSync(
  path.join(outputDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

const totalChapters = manifest.books.reduce(
  (total, book) => total + book.chapters,
  0,
);

const totalVerses = manifest.books.reduce(
  (total, book) => total + book.verses,
  0,
);

console.log("=== SBLGNT GENERATION COMPLETE ===");
console.log(`Books: ${manifest.books.length}`);
console.log(`Chapters: ${totalChapters}`);
console.log(`Verses: ${totalVerses}`);
console.log(`Output: ${outputDirectory}`);

