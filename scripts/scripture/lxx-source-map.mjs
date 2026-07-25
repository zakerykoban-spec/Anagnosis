export const LXX_SOURCE_ROOT =
  "imports/scripture/first1k-lxx/data/tlg0527";

export const LXX_SOURCE_OVERRIDES = Object.freeze({
  /**
   * Sirach
   *
   * grc1 = John Henry Arthur Hart, Codex 248, 1909
   * grc2 = Henry Barclay Swete, 1896
   */
  tlg034: "tlg0527.tlg034.1st1K-grc2.xml",

  /**
   * Isaiah
   *
   * grc1 = Henry Barclay Swete, 1905
   * grc2 = Richard Rusden Ottley, Codex Alexandrinus, 1904
   */
  tlg048: "tlg0527.tlg048.1st1K-grc1.xml",
});

/**
 * Known omissions permitted in the Version 1 corpus.
 *
 * First1KGreek contains CTS metadata for Ecclesiastes but no text
 * edition. The importer records this omission and continues.
 */
export const LXX_ALLOWED_OMISSIONS = Object.freeze({
  tlg030: {
    book: "Ecclesiastes",
    reason:
      "First1KGreek contains CTS metadata but no corresponding text XML.",
  },
});

export function resolveLxxSourceFile(workId, availableFiles) {
  const override = LXX_SOURCE_OVERRIDES[workId];

  if (override) {
    if (!availableFiles.includes(override)) {
      throw new Error(
        `Configured LXX source is missing for ${workId}: ${override}`,
      );
    }

    return override;
  }

  const greekFiles = availableFiles.filter((fileName) =>
    /\.1st1K-grc\d+\.xml$/u.test(fileName),
  );

  if (greekFiles.length === 0) {
    if (Object.hasOwn(LXX_ALLOWED_OMISSIONS, workId)) {
      return null;
    }

    throw new Error(`No Greek LXX edition found for ${workId}.`);
  }

  if (greekFiles.length > 1) {
    throw new Error(
      `Multiple Greek LXX editions found for ${workId}; ` +
        `an explicit source override is required: ${greekFiles.join(", ")}`,
    );
  }

  return greekFiles[0];
}
