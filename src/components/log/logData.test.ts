import { describe, expect, it } from "vitest";
import type { TranscriptEntry } from "@/lib/health/types";
import { shownResolved, symptomSpans, symptomsInLog } from "./logData";

const entry = (e: Partial<TranscriptEntry> & Pick<TranscriptEntry, "id" | "at">): TranscriptEntry => ({
  text: "x",
  source: "typed",
  findings: [],
  resolved: [],
  ...e,
});

describe("diary log data", () => {
  it("shows only the improvements that were actually reported, not the whole symptom family", () => {
    const entries = [
      entry({ id: "a", at: 1, findings: ["headache"] }),
      entry({ id: "b", at: 2, resolved: ["headache", "migraine", "cluster_headache"] }),
    ];
    expect(shownResolved(entries).get("b")).toEqual(["headache"]);
    expect(symptomsInLog(entries)).toEqual(["headache"]);
  });

  it("names no improvement for a symptom that was never reported", () => {
    const entries = [entry({ id: "b", at: 2, resolved: ["headache", "migraine"] })];
    expect(shownResolved(entries).get("b")).toBeUndefined();
    expect(symptomsInLog(entries)).toEqual([]);
  });

  it("closes a span as resolved when a general all-clear cleared it", () => {
    const entries = [
      entry({ id: "a", at: 1_000, findings: ["nausea"] }),
      entry({ id: "b", at: 5_000, cleared: ["nausea"] }),
    ];
    const [span] = symptomSpans(entries, [], 9_000);
    expect(span).toMatchObject({ id: "nausea", state: "resolved", end: 5_000 });
  });
});
