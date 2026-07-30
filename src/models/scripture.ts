export type ScriptureSourceId = "sblgnt" | "lxx";

export type ScriptureReferencePart = number | string;

export interface ScriptureSourceMetadata {
  id: ScriptureSourceId;
  edition: string;
  version: string;
  editor: string;
  license: string;
  transformed: boolean;
}

export interface ScriptureVerse {
  id: string;
  chapter: ScriptureReferencePart;
  number: ScriptureReferencePart;
  sourceText: string;
  displayText: string;
}

export interface ScriptureChapter {
  number: ScriptureReferencePart;
  verses: ScriptureVerse[];
}

export interface ScriptureBookMetadata {
  id: string;
  code: string;
  order: number;
  titleGreek: string;
  sourceHeading: string;
}

export interface ScriptureBook {
  schemaVersion: 1;
  source: ScriptureSourceMetadata;
  book: ScriptureBookMetadata;
  chapters: ScriptureChapter[];
}

export interface ScriptureManifestBook {
  id: string;
  code: string;
  order: number;
  titleGreek: string;
  filename: string;
  chapterNumbers?: ScriptureReferencePart[];
  chapters: number;
  verses: number;
}

export interface ScriptureManifest {
  schemaVersion: 1;
  source: ScriptureSourceId;
  sourceVersion: string;
  books: ScriptureManifestBook[];
}

export interface VerseReference {
  bookId: string;
  chapter: number;
  verse: number;
}

export interface PassageReference {
  start: VerseReference;
  end: VerseReference;
}
