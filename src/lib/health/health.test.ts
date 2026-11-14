import { describe, expect, it } from "vitest";
import { extractSymptoms, mergeFindings } from "./symptoms";
import { BASELINE, kickVitals, overallSeverity, statusOf, stepVitals, targetVitals } from "./vitals";
import { safetyAlerts, mentionsAllergen } from "./safety";
import { judgeAiText, reviewAiText } from "./prompt";
import { alertCopy } from "@/lib/i18n/pages/safety";
import { DEMO_SPEED } from "./vitals";
import { fallbackChain, BROWSER_MODELS } from "@/lib/llm/browser-models";
import { regionLabels } from "./regions";
import { adviceOf } from "./advice";
import { messages } from "@/lib/i18n/messages";
import { hazardsOf } from "@/lib/science/nasa";
import type { Finding, TranscriptEntry } from "./types";

const pt = messages.pt;
const report = (text: string, now = 1_000_000) => mergeFindings([], extractSymptoms(text, "pt", now)).map((f) => ({ ...f }));
const entry = (text: string, at: number, findings: Finding[] = []): TranscriptEntry => ({
  id: `e${at}`,
  text,
  at,
  source: "typed",
  findings: findings.map((f) => f.id),
  resolved: [],
});

describe("vitals simulation", () => {
  it("puts a reported fever above the attention threshold at once", () => {
    for (const text of ["estou com febre", "estou com uma febre leve", "febre muito forte"]) {
      const findings = report(text);
      const target = targetVitals(findings, BASELINE);
      expect(target.temperature).toBeGreaterThan(37.7);
      const kicked = kickVitals(BASELINE, target);
      expect(kicked.temperature).toBe(target.temperature);
      expect(statusOf(overallSeverity(findings, kicked))).not.toBe("nominal");
    }
  });

  it("does not stack two fevers", () => {
    const fever: Finding = { id: "fever", regions: ["head"], severity: 2, reportedAt: 0, evidence: "" };
    expect(targetVitals([fever, { ...fever }], BASELINE).temperature).toBeCloseTo(38.4, 5);
  });

  it("fades a resolved symptom gradually instead of snapping back", () => {
    const fever: Finding = { id: "fever", regions: ["head"], severity: 2, reportedAt: 0, evidence: "" };
    const rec = [{ finding: fever, resolvedAt: 0 }];
    const t0 = targetVitals([], BASELINE, rec, 0).temperature;
    const t30 = targetVitals([], BASELINE, rec, 30_000).temperature;
    const t5m = targetVitals([], BASELINE, rec, 300_000).temperature;
    expect(t0).toBeCloseTo(38.4, 5);
    expect(t30).toBeLessThan(t0);
    expect(t30).toBeGreaterThan(37.7);
    expect(t5m).toBeLessThan(37);
    // Eased by the per-tick step too: one second later the reading barely moves.
    const next = stepVitals({ ...BASELINE, temperature: 38.4 }, { ...BASELINE, temperature: t30 });
    expect(next.temperature).toBeGreaterThan(38);
  });

  it("ignores a recovery when the symptom is reported again", () => {
    const fever: Finding = { id: "fever", regions: ["head"], severity: 3, reportedAt: 0, evidence: "" };
    const t = targetVitals([fever], BASELINE, [{ finding: { ...fever, severity: 1 }, resolvedAt: 0 }], 0);
    expect(t.temperature).toBeCloseTo(39.2, 5);
  });
});

describe("allergy cross-check", () => {
  const base = { allergies: "dipirona, látex", medications: "", entries: [] as TranscriptEntry[], findings: [] as Finding[], adviceFor: (f: Finding) => adviceOf(f, pt) };

  it("flags a medication in use that the crew member is allergic to", () => {
    const alerts = safetyAlerts({ ...base, allergies: "AINEs", medications: "ibuprofeno 400 mg se dor" });
    expect(alerts[0]).toMatchObject({ kind: "medication", level: 3 });
    expect(alerts[0].matches[0]).toMatchObject({ mentioned: "ibuprofeno", allergen: "AINEs", relation: "group", cls: "nsaid" });
  });

  it("treats a reported intake as critical and a mere mention as caution", () => {
    const now = 10_000_000;
    const taken = safetyAlerts({ ...base, entries: [entry("tomei dipirona agora", now - 1000)], now });
    expect(taken.find((a) => a.kind === "exposure")?.level).toBe(3);
    const mention = safetyAlerts({ ...base, entries: [entry("posso usar novalgina?", now - 1000)], now });
    expect(mention.find((a) => a.kind === "exposure")?.level).toBe(2);
  });

  it("raises a possible severe reaction when breathlessness follows an intake", () => {
    const now = 10_000_000;
    const findings = report("estou com falta de ar e manchas na pele", now);
    const alerts = safetyAlerts({ ...base, entries: [entry("tomei dipirona", now - 60_000)], findings, now });
    expect(alerts.find((a) => a.kind === "reaction")).toMatchObject({ level: 3, symptom: "dyspnea" });
  });

  it("raises the reaction alert when intake and symptoms come in the same report", () => {
    const now = 10_000_000;
    const findings = report("tomei dipirona e agora estou com falta de ar", now - 5);
    const alerts = safetyAlerts({ ...base, entries: [entry("tomei dipirona e agora estou com falta de ar", now, findings)], findings, now });
    expect(alerts.find((a) => a.kind === "reaction")?.level).toBe(3);
  });

  it("warns when onboard advice points at a kit drug the crew member may react to", () => {
    const findings = report("dor de cabeça latejando de um lado só, piora com a luz");
    expect(findings[0].id).toBe("migraine");
    const alerts = safetyAlerts({ ...base, findings });
    expect(alerts.some((a) => a.kind === "advice" && a.symptom === "migraine" && a.matches.some((m) => m.drugId === "dipyrone"))).toBe(true);
  });

  it("stays silent without allergies and outside the 24 h window", () => {
    expect(safetyAlerts({ ...base, allergies: "", entries: [entry("tomei dipirona", 0)] })).toEqual([]);
    expect(safetyAlerts({ ...base, entries: [entry("tomei dipirona", 0)], now: 2 * 86_400_000 })).toEqual([]);
  });

  it("detects allergens with accents and brand names", () => {
    expect(mentionsAllergen("Tome uma Dipirona do kit", "dipirona")).toBe(true);
    expect(mentionsAllergen("Use Advil 400 mg", "anti-inflamatórios")).toBe(true);
    expect(mentionsAllergen("Hidrate-se e descanse", "dipirona")).toBe(false);
  });
});

describe("AI answer filter", () => {
  const said = "Estou com dor de cabeça e um pouco de enjoo";
  it("drops answers that only restate the report", () => {
    expect(judgeAiText("Você está com dor de cabeça e um pouco de enjoo.", said, "")).not.toBe("ok");
    expect(judgeAiText("Entendo que você está com dor de cabeça e enjoo agora.", said, "")).toBe("echo");
  });
  it("keeps answers that add guidance", () => {
    const good =
      "Fique em repouso com a cabeça elevada e reavalie em 30 minutos. Em microgravidade os fluidos sobem para a cabeça e o CO₂ da cabine soma. Se surgir vômito ou rigidez na nuca, avise o médico de voo.";
    expect(judgeAiText(good, said, "")).toBe("ok");
  });
  it("drops answers that name an allergen", () => {
    expect(judgeAiText("Tome dipirona do kit, deite em local escuro e hidrate-se bem durante a próxima hora.", said, "dipirona")).toBe("allergen");
  });
});

describe("body map labels", () => {
  it("tags each symptom once, even when it spans several regions", () => {
    const findings = report("estou com febre e dor de cabeça");
    const labels = regionLabels(findings, (f) => pt.symptoms[f.id].label);
    const all = Object.values(labels).join(" | ");
    expect(all.match(/Febre/g)?.length).toBe(1);
    expect(labels.torso).toBeUndefined();
    expect(labels.head).toMatch(/\+1$/);
  });
  it("puts whole-body symptoms on the torso only", () => {
    const findings = report("dor nas articulações");
    expect(Object.keys(regionLabels(findings, (f) => f.id))).toEqual(["torso"]);
  });
});

describe("NASA hazards", () => {
  it("links symptoms to RIDGE hazards and adds distance to critical ones", () => {
    expect(hazardsOf({ id: "vision", severity: 1 })).toContain("gravity");
    expect(hazardsOf({ id: "low_mood", severity: 1 })).toContain("isolation");
    expect(hazardsOf({ id: "chest_pain", severity: 3 })).toContain("distance");
    expect(hazardsOf({ id: "nausea", severity: 3, redFlag: "radiation" })).toEqual(expect.arrayContaining(["radiation", "distance"]));
  });
});

describe("brand <-> active ingredient", () => {
  const now = 10_000_000;
  const alertFor = (allergies: string, text: string) =>
    safetyAlerts({ allergies, medications: "", entries: [entry(text, now - 1000)], findings: [], adviceFor: () => "", now }).find((a) => a.kind === "exposure");

  it("flags hyoscine for a Buscopan allergy in EN and PT, naming both", () => {
    const en = alertFor("Buscopan", "I have a fever, maybe I should take hyoscine");
    expect(en).toBeDefined();
    expect(alertCopy(en!, messages.en, "en").head).toBe("Hyoscine is the active ingredient in Buscopan, which is on your allergy list");
    const ptAlert = alertFor("Buscopan", "Estou com febre, talvez eu deva tomar hioscina");
    expect(alertCopy(ptAlert!, messages.pt, "pt").head).toBe("Hioscina é o princípio ativo de Buscopan, que consta nas suas alergias");
    // The English generic typed in Portuguese still matches.
    expect(alertFor("Buscopan", "Estou com febre, talvez eu deva tomar hyoscine")).toBeDefined();
  });

  it("works in the other direction, ignoring case and accents", () => {
    const a = alertFor("escopolamina", "posso usar BUSCOPAN?");
    expect(a?.matches[0]).toMatchObject({ mentioned: "BUSCOPAN", allergen: "escopolamina", relation: "contains" });
    expect(alertCopy(a!, messages.en, "en").head).toBe("BUSCOPAN contains escopolamina, which is on your allergy list");
    expect(alertFor("Ácido Acetilsalicílico", "can I take an aspirin?")?.matches[0].relation).toBe("contains");
    expect(alertFor("aspirina", "tomei acido acetilsalicilico")?.level).toBe(3);
  });

  it.each([
    ["Buscopan", "hyoscine"], ["Buscopan", "escopolamina"],
    ["Dipirona", "metamizole"], ["Novalgina", "dipirona"], ["metamizol", "Novalgina"],
    ["Tylenol", "paracetamol"], ["Tylenol", "acetaminophen"], ["paracetamol", "Tylenol"],
    ["Advil", "ibuprofeno"], ["ibuprofen", "Advil"],
    ["Aspirina", "ácido acetilsalicílico"],
    ["Dramin", "dimenidrinato"], ["dimenhydrinate", "Dramin"],
    ["Plasil", "metoclopramida"], ["metoclopramide", "Plasil"],
    ["Amoxil", "amoxicilina"], ["amoxicillin", "Amoxil"],
  ])("allergy %s matches a report naming %s", (allergy, said) => {
    expect(alertFor(allergy, `posso tomar ${said}?`)).toBeDefined();
  });

  it("explains same-ingredient brands, synonyms and groups", () => {
    expect(alertCopy(alertFor("Novalgina", "tem Anador no kit?")!, messages.en, "en").head).toContain("has the same active ingredient as Novalgina");
    expect(alertCopy(alertFor("metamizol", "posso usar dipirona?")!, messages.pt, "pt").head).toBe("Dipirona é outro nome de metamizol, que consta nas suas alergias");
    expect(alertCopy(alertFor("ibuprofeno", "can I take naproxen?")!, messages.en, "en").head).toBe("Naproxen is in the same group as ibuprofeno (anti-inflammatories, NSAIDs), which is on your allergy list");
  });

  it("does not over-match unrelated drugs", () => {
    expect(alertFor("Buscopan", "posso tomar dramin?")).toBeUndefined();
    expect(alertFor("Dipirona", "tomei paracetamol")).toBeUndefined();
    expect(alertFor("Plasil", "a nasa planeja")).toBeUndefined();
  });
});

describe("AI echo filter", () => {
  const said = "I have a fever, maybe I should take hyoscine";
  it("hides an answer that only repeats the report", () => {
    expect(reviewAiText("I have a fever, maybe I should take hyoscine.", said, "").verdict).not.toBe("ok");
    expect(reviewAiText("You have a fever and maybe you should take hyoscine.", said, "").verdict).not.toBe("ok");
  });
  it("strips the restated sentence and keeps the useful rest", () => {
    const r = reviewAiText(
      "You have a fever and maybe should take hyoscine. Rest, drink water in small sips and recheck the temperature in 30 minutes. If it passes 39 degrees or a stiff neck appears, tell the flight surgeon.",
      said,
      "",
    );
    expect(r.verdict).toBe("ok");
    expect(r.text.startsWith("Rest, drink water")).toBe(true);
  });
});

describe("demo mode and model fallback", () => {
  it("brings vitals back to range within 10 s after everything is marked gone", () => {
    const findings = report("dor forte no peito e falta de ar");
    let v = BASELINE;
    for (let i = 0; i < 5; i++) v = stepVitals(v, targetVitals(findings, BASELINE), true);
    expect(statusOf(overallSeverity(findings, v))).toBe("critical");
    const rec = findings.map((f) => ({ finding: f, resolvedAt: 0 }));
    for (let s = 1; s <= 8; s++) v = stepVitals(v, targetVitals([], BASELINE, rec, s * 1000, DEMO_SPEED.recoveryScale), true);
    expect(statusOf(overallSeverity([], v))).toBe("nominal");
  });

  it("tries smaller browser models after the chosen one", () => {
    const gemma = BROWSER_MODELS.find((m) => m.id.includes("gemma"))!;
    expect(fallbackChain(gemma).map((m) => m.label)).toEqual(["Gemma 3 1B", "Qwen 2.5 0.5B"]);
    const big = BROWSER_MODELS.find((m) => m.id.includes("1.5B"))!;
    expect(fallbackChain(big).map((m) => m.label)).toEqual(["Qwen 2.5 1.5B", "Gemma 3 1B", "Qwen 2.5 0.5B"]);
  });
});
