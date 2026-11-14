import type { Finding, SymptomId, TranscriptEntry } from "./types";
import { CLASS_WORDS, CROSS_REACTIVE, DRUGS, KIT_CLASSES, LATEX_PROCEDURE, wordsRegex, type Drug, type DrugClass } from "./drugs";

export { DRUG_CLASSES, type DrugClass } from "./drugs";

/**
 * Allergy cross-check. Runs on device, instantly, with no AI involved:
 * medications named in reports, in the crew profile and in the onboard advice
 * are matched against the registered allergies through a brand <-> active
 * ingredient dictionary, case- and accent-insensitive, and every overlap
 * becomes an alert that names what the person wrote and the allergy it hits.
 */

/* ---------- Normalization that remembers where each character came from ---------- */

interface Mapped {
  /** Lowercase, no accents, punctuation as single spaces (same as symptoms.normalize). */
  text: string;
  /** Index in the original text for each character of `text`. */
  map: number[];
  original: string;
}

function mapNormalize(original: string): Mapped {
  let text = "";
  const map: number[] = [];
  let space = true;
  for (let i = 0; i < original.length; i++) {
    const base = original[i].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    for (const ch of base) {
      const c = /\s/.test(ch) || !/[\w₂]/.test(ch) ? " " : ch;
      if (c === " ") {
        if (space) continue;
        space = true;
      } else space = false;
      text += c;
      map.push(i);
    }
  }
  if (text.endsWith(" ")) {
    text = text.slice(0, -1);
    map.pop();
  }
  return { text, map, original };
}

/** The original spelling behind a match in the normalized text. */
function originalOf(m: Mapped, start: number, length: number) {
  return m.original.slice(m.map[start], m.map[start + length - 1] + 1).trim();
}

/* ---------- Finding drug names in text ---------- */

type NameKind = "generic" | "brand" | "group";

interface Mention {
  /** As written in the text. */
  word: string;
  kind: NameKind;
  drug?: Drug;
  cls?: DrugClass;
}

const DRUG_MATCHERS = DRUGS.map((d) => ({ d, generic: wordsRegex(d.generics), brand: d.brands.length ? wordsRegex(d.brands) : null }));
const CLASS_MATCHERS = (Object.entries(CLASS_WORDS) as [DrugClass, string[]][]).map(([cls, words]) => ({ cls, re: wordsRegex(words) }));

function mentionsIn(text: string, classes: DrugClass[]): Mention[] {
  const m = mapNormalize(text);
  const out: Mention[] = [];
  const scan = (re: RegExp, make: (word: string) => Mention) => {
    for (const hit of m.text.matchAll(re)) out.push(make(originalOf(m, hit.index ?? 0, hit[0].length)));
  };
  for (const { d, generic, brand } of DRUG_MATCHERS) {
    scan(generic, (word) => ({ word, kind: "generic", drug: d }));
    if (brand) scan(brand, (word) => ({ word, kind: "brand", drug: d }));
  }
  for (const { cls, re } of CLASS_MATCHERS) if (classes.includes(cls)) scan(re, (word) => ({ word, kind: "group", cls }));
  return out;
}

/* ---------- The crew member's allergies ---------- */

interface AllergyName {
  /** As written in the profile. */
  word: string;
  kind: NameKind;
}

export interface AllergyProfile {
  drugs: Map<string, AllergyName>;
  /** Groups the person reacts to: named directly ("AINEs") or through a cross-reactive drug. */
  classes: Map<DrugClass, AllergyName>;
  /** Allergies outside the dictionary, matched as plain words. */
  terms: { word: string; norm: string }[];
}

const ALL_CLASSES = Object.keys(CLASS_WORDS) as DrugClass[];

export function allergyProfile(allergies: string): AllergyProfile {
  const p: AllergyProfile = { drugs: new Map(), classes: new Map(), terms: [] };
  for (const raw of allergies.split(/[,;/\n]|\s+e\s+|\s+and\s+/i)) {
    const item = raw.trim();
    if (!item) continue;
    const found = mentionsIn(item, ALL_CLASSES);
    if (!found.length) {
      const norm = mapNormalize(item).text;
      if (norm.length >= 4) p.terms.push({ word: item, norm });
      continue;
    }
    for (const f of found) {
      const name = { word: f.word, kind: f.kind };
      if (f.drug) {
        if (!p.drugs.has(f.drug.id)) p.drugs.set(f.drug.id, name);
        for (const c of f.drug.classes) if (CROSS_REACTIVE.includes(c) && !p.classes.has(c)) p.classes.set(c, name);
      } else if (f.cls && !p.classes.has(f.cls)) p.classes.set(f.cls, name);
    }
  }
  return p;
}

const hasAllergies = (p: AllergyProfile) => p.drugs.size > 0 || p.classes.size > 0 || p.terms.length > 0;

/* ---------- Matching ---------- */

/**
 * How a name in the text relates to the allergy:
 * same = the very name; ingredientOf = generic of the allergic brand;
 * contains = brand containing the allergic generic; sameIngredient = two brands,
 * one ingredient; synonym = two names of one ingredient; group = same
 * cross-reactive group; kit = generic kit item in the advice.
 */
export type Relation = "same" | "ingredientOf" | "contains" | "sameIngredient" | "synonym" | "group" | "kit";

export interface AllergenMatch {
  /** Name as written in the text (report, medication list, advice). */
  mentioned: string;
  /** Name as written in the allergy list. */
  allergen: string;
  relation: Relation;
  drugId?: string;
  cls?: DrugClass;
}

const same = (a: string, b: string) => mapNormalize(a).text === mapNormalize(b).text;

function relationOf(mention: NameKind, allergy: NameKind, mentioned: string, allergen: string): Relation {
  if (same(mentioned, allergen)) return "same";
  if (mention === "generic" && allergy === "brand") return "ingredientOf";
  if (mention === "brand" && allergy === "generic") return "contains";
  if (mention === "brand" && allergy === "brand") return "sameIngredient";
  return "synonym";
}

/** Allergens named (directly, by brand/ingredient or by group) in a piece of text. */
export function allergensIn(text: string, p: AllergyProfile): AllergenMatch[] {
  const out: AllergenMatch[] = [];
  const add = (m: AllergenMatch) => {
    if (!out.some((x) => same(x.mentioned, m.mentioned) && same(x.allergen, m.allergen))) out.push(m);
  };
  for (const m of mentionsIn(text, CROSS_REACTIVE)) {
    if (m.drug) {
      const a = p.drugs.get(m.drug.id);
      if (a) {
        add({ mentioned: m.word, allergen: a.word, relation: relationOf(m.kind, a.kind, m.word, a.word), drugId: m.drug.id });
        continue;
      }
      const cls = m.drug.classes.find((c) => CROSS_REACTIVE.includes(c) && p.classes.has(c));
      if (cls) add({ mentioned: m.word, allergen: p.classes.get(cls)!.word, relation: "group", drugId: m.drug.id, cls });
    } else if (m.cls && p.classes.has(m.cls)) {
      const a = p.classes.get(m.cls)!;
      add({ mentioned: m.word, allergen: a.word, relation: a.kind === "group" ? "same" : "group", cls: m.cls });
    }
  }
  if (p.terms.length) {
    const norm = mapNormalize(text).text;
    for (const t of p.terms) {
      if (new RegExp(`\\b${t.norm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(norm)) add({ mentioned: t.word, allergen: t.word, relation: "same" });
    }
  }
  return out;
}

/** Kit items the onboard advice points at ("analgésico do kit") that may contain an allergen. */
function kitConflicts(advice: string, p: AllergyProfile): AllergenMatch[] {
  const out: AllergenMatch[] = [];
  for (const m of mentionsIn(advice, KIT_CLASSES)) {
    if (!m.cls) continue;
    for (const [id, a] of p.drugs) {
      const d = DRUGS.find((x) => x.id === id);
      if (d?.classes.includes(m.cls) && !out.some((x) => x.allergen === a.word)) out.push({ mentioned: m.word, allergen: a.word, relation: "kit", drugId: id, cls: m.cls });
    }
  }
  const latex = p.drugs.get("latex");
  const proc = mapNormalize(advice).text.match(LATEX_PROCEDURE);
  if (latex && proc) out.push({ mentioned: proc[0], allergen: latex.word, relation: "kit", drugId: "latex", cls: "latex" });
  return out;
}

/* ---------- Alerts ---------- */

/** Words that mean the drug was actually taken, not just mentioned. */
const TAKEN = /\b(tomei|tomou|usei|apliquei|ingeri|engoli|tomando|took|taken|taking|used|swallowed|had)\b/;

/** Symptoms that can be an allergic reaction. */
const REACTION: SymptomId[] = ["skin_rash", "dyspnea", "fainting", "dizziness", "nausea", "cough", "sore_throat"];
/** Signs of a severe reaction (anaphylaxis). */
const SEVERE_REACTION: SymptomId[] = ["dyspnea", "fainting"];

/** Mentions in a report count for 24 h. */
const REPORT_WINDOW = 24 * 3_600_000;

export type SafetyKind = "medication" | "exposure" | "reaction" | "advice";

export interface SafetyAlert {
  /** Stable key: list key, and what a dismissal remembers. */
  key: string;
  kind: SafetyKind;
  /** 3 = critical (shown as an alert), 2 = caution. */
  level: 2 | 3;
  matches: AllergenMatch[];
  /** Exposure: the report said the drug was taken. */
  taken?: boolean;
  /** Symptom whose advice or reaction triggered the alert. */
  symptom?: SymptomId;
  /** Report that mentioned the allergen. */
  entryId?: string;
  at?: number;
}

export interface SafetyInput {
  allergies: string;
  medications: string;
  entries: TranscriptEntry[];
  findings: Finding[];
  /** Advice text per active finding, in the current language. */
  adviceFor: (f: Finding) => string;
  now?: number;
}

/** Short, stable fingerprint of profile text, so editing the profile brings a dismissed alert back. */
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Every allergy conflict that applies right now, most severe first. */
export function safetyAlerts({ allergies, medications, entries, findings, adviceFor, now = Date.now() }: SafetyInput): SafetyAlert[] {
  const p = allergyProfile(allergies);
  if (!hasAllergies(p)) return [];
  const out: SafetyAlert[] = [];

  // 1. A medication in regular use that the crew member is allergic to.
  const meds = allergensIn(medications, p);
  if (meds.length) out.push({ key: `med-${hash(`${allergies}|${medications}`)}`, kind: "medication", level: 3, matches: meds });

  // 2. A report in the last 24 h that names an allergen (taken = critical).
  let exposure: TranscriptEntry | null = null;
  for (const e of entries) {
    if (e.source === "action" || !e.text || now - e.at > REPORT_WINDOW) continue;
    const matches = allergensIn(e.text, p);
    if (!matches.length) continue;
    const taken = TAKEN.test(mapNormalize(e.text).text);
    if (taken && (!exposure || e.at > exposure.at)) exposure = e;
    out.push({ key: `exp-${e.id}`, kind: "exposure", level: taken ? 3 : 2, matches, taken, entryId: e.id, at: e.at });
  }

  // 3. Reaction symptoms reported at or after an intake: possible allergic reaction.
  if (exposure) {
    const since = exposure.at - 60_000; // symptoms told in the same report carry a slightly earlier timestamp
    const reaction = findings.filter((f) => REACTION.includes(f.id) && f.reportedAt >= since);
    if (reaction.length) {
      const first = reaction.find((f) => SEVERE_REACTION.includes(f.id)) ?? reaction[0];
      const severe = SEVERE_REACTION.includes(first.id);
      out.push({ key: `reaction-${exposure.id}-${first.id}`, kind: "reaction", level: severe ? 3 : 2, matches: [], symptom: first.id, entryId: exposure.id, at: first.reportedAt });
    }
  }

  // 4. Onboard advice that points at a kit item the crew member may be allergic to.
  for (const f of findings) {
    const matches = kitConflicts(adviceFor(f), p);
    if (matches.length) out.push({ key: `adv-${f.id}-${f.reportedAt}`, kind: "advice", level: 2, matches, symptom: f.id });
  }

  return out.sort((x, y) => y.level - x.level);
}

/** True when free text (e.g. an AI answer) names something the crew member is allergic to. */
export function mentionsAllergen(text: string, allergies: string): boolean {
  return allergensIn(text, allergyProfile(allergies)).length > 0;
}
