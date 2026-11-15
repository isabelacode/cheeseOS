import { describe, expect, it } from "vitest";
import { extractSymptoms, repairTranscriptPt } from "./symptoms";
import { BASELINE, stepVitals, targetVitals } from "./vitals";
import { safetyAlerts } from "./safety";
import type { Finding, TranscriptEntry } from "./types";

const ids = (text: string, locale: "pt" | "en") => extractSymptoms(text, locale, 1).findings.map((f) => f.id);
const flags = (text: string, locale: "pt" | "en") => extractSymptoms(text, locale, 1).findings.map((f) => f.redFlag).filter(Boolean);

describe("negation", () => {
  it("does not read a negated 'I'm fine' as all good", () => {
    for (const [text, locale] of [
      ["não me sinto bem", "pt"],
      ["não estou bem", "pt"],
      ["I'm not feeling well", "en"],
      ["not feeling good", "en"],
    ] as const) {
      expect(extractSymptoms(text, locale, 1).allGood, text).toBe(false);
    }
    expect(extractSymptoms("estou bem", "pt", 1).allGood).toBe(true);
    expect(extractSymptoms("I'm fine", "en", 1).allGood).toBe(true);
    expect(extractSymptoms("sem febre, estou bem", "pt", 1).allGood).toBe(true);
  });

  it("does not resolve a symptom the crew member says has NOT gone", () => {
    for (const [text, locale] of [
      ["a dor de cabeça não passou", "pt"],
      ["a febre não melhorou", "pt"],
      ["a febre ainda nao passou", "pt"],
      ["the headache is not gone", "en"],
      ["my fever hasn't gone away", "en"],
      ["my cough isn't better", "en"],
    ] as const) {
      const ex = extractSymptoms(text, locale, 1);
      expect(ex.resolved, text).toEqual([]);
      expect(ex.findings.length, text).toBeGreaterThan(0);
    }
    expect(extractSymptoms("a febre passou", "pt", 1).resolved).toContain("fever");
    expect(extractSymptoms("the cough is gone", "en", 1).resolved).toContain("cough");
  });

  it("understands 'nunca' and English contractions as negation", () => {
    expect(ids("nunca tive dor no peito", "pt")).toEqual([]);
    expect(ids("I didn't faint", "en")).toEqual([]);
    expect(ids("I haven't had chest pain", "en")).toEqual([]);
  });

  it("keeps the generic symptom when the more specific one is negated", () => {
    expect(ids("headache without pain behind my eyes", "en")).toEqual(["headache"]);
    expect(ids("dor no braço sem formigamento na mão", "pt")).toEqual(["arm_pain"]);
  });

  it("does not treat 'não aguento mais' as negating the symptom", () => {
    expect(ids("não aguento mais essa dor de cabeça", "pt")).toContain("headache");
  });
});

describe("red-flag gaps", () => {
  it("detects chest pressure in Portuguese", () => {
    expect(ids("tenho uma pressão no peito", "pt")).toContain("chest_pain");
  });

  it("flags cardiac pain radiating with a gerund ('irradiando')", () => {
    expect(flags("dor no peito irradiando pro braço esquerdo", "pt")).toContain("cardiac");
  });

  it("flags cardiac pain when the left arm is named in an elliptical clause", () => {
    expect(flags("dor no peito e no braço esquerdo", "pt")).toContain("cardiac");
    expect(flags("chest pain and also in my left arm", "en")).toContain("cardiac");
  });
});

describe("false positives", () => {
  it("does not report bleeding for blood tests or blood pressure", () => {
    for (const [text, locale] of [
      ["blood pressure is fine", "en"],
      ["I had my blood test", "en"],
      ["fiz exame de sangue", "pt"],
      ["coleta de sangue hoje", "pt"],
    ] as const) {
      expect(ids(text, locale), text).not.toContain("bleeding");
    }
    expect(ids("estou sangrando pelo nariz", "pt")).toContain("bleeding");
    expect(ids("blood in my urine", "en")).toContain("bleeding");
  });
});

describe("allergy safety", () => {
  const now = 10 * 86_400_000;
  const entry = (text: string): TranscriptEntry => ({ id: "e1", text, at: now - 1000, source: "typed", findings: [], resolved: [] });
  const run = (allergies: string, text: string, findings: Finding[] = [], advice = "") =>
    safetyAlerts({ allergies, medications: "", entries: text ? [entry(text)] : [], findings, adviceFor: () => advice, now });

  it("does not treat 'nenhuma' / 'none' as an allergy", () => {
    for (const allergies of ["Nenhuma", "none", "Sem alergias conhecidas", "NKDA", "não tenho"]) {
      expect(run(allergies, "nenhuma dor, tudo none"), allergies).toEqual([]);
    }
  });

  it("does not count a negated intake as taken", () => {
    for (const text of ["não tomei dipirona", "I haven't taken dipyrone", "I never took dipyrone"]) {
      const a = run("dipirona", text).find((x) => x.kind === "exposure");
      expect(a?.taken, text).toBe(false);
      expect(a?.level, text).toBe(2);
    }
    expect(run("dipirona", "tomei dipirona").find((x) => x.kind === "exposure")?.taken).toBe(true);
  });

  it("matches a drug against an allergy to a whole named group", () => {
    const a = run("antieméticos", "tomei dramin").find((x) => x.kind === "exposure");
    expect(a?.matches[0]).toMatchObject({ allergen: "antieméticos", relation: "group" });
  });

  it("warns about kit advice when the allergy is written as a group", () => {
    const f: Finding = { id: "headache", regions: ["head"], severity: 1, reportedAt: now, evidence: "" };
    const alerts = run("AINEs", "", [f], "Tome o analgésico do kit.");
    expect(alerts.some((x) => x.kind === "advice")).toBe(true);
  });

  it("knows combination brands contain every ingredient", () => {
    expect(run("paracetamol", "tomei buscoduo").find((x) => x.kind === "exposure")).toBeDefined();
    expect(run("paracetamol", "I took percocet").find((x) => x.kind === "exposure")).toBeDefined();
    expect(run("aspirina", "I took excedrin").find((x) => x.kind === "exposure")).toBeDefined();
  });
});

describe("vitals edge cases", () => {
  it("falls back to the default baseline for a non-numeric resting heart rate", () => {
    const t = targetVitals([], { ...BASELINE, heartRate: Number.NaN });
    expect(t.heartRate).toBe(BASELINE.heartRate);
  });

  it("recovers from a non-finite current reading instead of staying NaN", () => {
    const next = stepVitals({ ...BASELINE, heartRate: Number.NaN }, BASELINE);
    expect(Number.isFinite(next.heartRate)).toBe(true);
  });

});

describe("voice transcription repairs (pt)", () => {
  const ids = (t: string) => extractSymptoms(t, "pt").findings.map((f) => f.id);
  it.each([
    ["Door no braço direito.", "arm_pain"],
    ["e estou com o Dorno Pé.", "foot_pain"],
    ["e está o condor no pé.", "foot_pain"],
    ["do ornum braço direito.", "arm_pain"],
    ["estou com dor numa perna", "leg_pain"],
    ["sinto dor em um pé", "foot_pain"],
  ])("%s -> %s", (text, id) => {
    expect(ids(text)).toContain(id);
  });

  it("leaves real words alone", () => {
    expect(repairTranscriptPt("o condominio dorme")).toBe("o condominio dorme");
  });
});
