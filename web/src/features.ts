import type { Stage } from './api'

// Plain-English names for the model's features (UCI Student Performance dataset),
// so teachers see "Second-period grade" instead of "G2".

export const FEATURE_LABELS: Record<string, string> = {
  school: 'School',
  sex: 'Sex',
  age: 'Age',
  address: 'Home address (urban/rural)',
  famsize: 'Family size',
  Pstatus: "Parents' cohabitation",
  Medu: "Mother's education (0–4)",
  Fedu: "Father's education (0–4)",
  Mjob: "Mother's job",
  Fjob: "Father's job",
  reason: 'Reason for choosing school',
  guardian: 'Guardian',
  traveltime: 'Travel time to school (1–4)',
  studytime: 'Weekly study time (1–4)',
  failures: 'Past class failures',
  schoolsup: 'Extra school support',
  famsup: 'Family educational support',
  paid: 'Extra paid classes',
  activities: 'Extra-curricular activities',
  nursery: 'Attended nursery school',
  higher: 'Wants higher education',
  internet: 'Internet at home',
  romantic: 'In a relationship',
  famrel: 'Family relationship quality (1–5)',
  freetime: 'Free time after school (1–5)',
  goout: 'Going out with friends (1–5)',
  Dalc: 'Weekday alcohol use (1–5)',
  Walc: 'Weekend alcohol use (1–5)',
  health: 'Health status (1–5)',
  absences: 'Absences',
  G1: 'First-period grade (0–20)',
  G2: 'Second-period grade (0–20)',
  attendance: 'Attendance %',
  quiz_avg: 'Average grade (G1, G2)',
  trend: 'Grade trend (G2 − G1)',
}

export function featureLabel(name: string): string {
  return FEATURE_LABELS[name] ?? name
}

/** The label without its scale hint: "Second-period grade (0–20)" -> "Second-period grade" */
export function shortFeatureLabel(name: string): string {
  return featureLabel(name).replace(/\s*\(.*\)$/, '')
}

/** What each stage's model knows about the student (see export/export_models.py). */
export const STAGE_LABELS: Record<Stage, string> = {
  after_period_2: 'Period 1 & 2 grades',
  after_period_1: 'Period 1 grade',
  start_of_term: 'No grades yet',
}

/**
 * The fields the what-if simulator lets a teacher change: things they can influence or anticipate.
 * start: where the slider starts when the value isn't known yet (e.g. no grades early in the term).
 * needs: a field that must be known first (the models only use G2 and absences once G1 is known).
 */
export type WhatIfField =
  | { name: string; kind: 'range'; min: number; max: number; start?: number; needs?: string; hint?: string }
  | { name: string; kind: 'yesno' }

export const WHAT_IF_FIELDS: WhatIfField[] = [
  { name: 'G1', kind: 'range', min: 0, max: 20, start: 10, hint: 'Scale 0–20' },
  { name: 'G2', kind: 'range', min: 0, max: 20, start: 10, needs: 'G1', hint: 'Scale 0–20' },
  { name: 'absences', kind: 'range', min: 0, max: 75, needs: 'G1' },
  { name: 'studytime', kind: 'range', min: 1, max: 4, hint: '1: <2h · 2: 2–5h · 3: 5–10h · 4: >10h' },
  { name: 'goout', kind: 'range', min: 1, max: 5, hint: '1: very low · 5: very high' },
  { name: 'schoolsup', kind: 'yesno' },
  { name: 'paid', kind: 'yesno' },
]
