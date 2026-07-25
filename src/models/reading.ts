import type { PassageReference } from "./scripture";

export type ReadingJourneyId =
  | "familiar"
  | "progressive"
  | "prayer";

export type ReadingUnitKind =
  | "narrative"
  | "discourse"
  | "poetry"
  | "prayer"
  | "canticle"
  | "letter";

export interface DiscourseUnit {
  id: string;
  corpus: "nt" | "lxx";
  bookId: string;
  titleGreek: string;
  titleEnglish?: string;
  kind: ReadingUnitKind;
  passage: PassageReference;
  order: number;
  editorialNote?: string;
}

export interface ReadingAssignment {
  id: string;
  journey: ReadingJourneyId;
  discourseUnitId: string;
}

export interface DailyOffice {
  id: string;
  day: number;
  assignments: ReadingAssignment[];
}

export interface ReadingPlan {
  schemaVersion: 1;
  id: string;
  titleGreek: string;
  titleEnglish?: string;
  version: number;
  offices: DailyOffice[];
}

export interface CompletedAssignment {
  assignmentId: string;
  completedAt: string;
}

export interface ReadingProgress {
  planId: string;
  planVersion: number;
  completedAssignments: CompletedAssignment[];
}
