import { describe, expect, it } from "vitest";
import { parseSnapshot } from "./store";

describe("saved session parsing", () => {
  it("returns null for missing or unreadable data", () => {
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot("{oops")).toBeNull();
    expect(parseSnapshot("null")).toBeNull();
    expect(parseSnapshot("[]")).toBeNull();
  });

  it("drops fields with the wrong shape instead of passing them to the session", () => {
    const s = parseSnapshot(JSON.stringify({ findings: { fever: 1 }, entries: "x", dismissedAlerts: [1, "a"] }))!;
    expect(s.findings).toEqual([]);
    expect(s.entries).toEqual([]);
    expect(s.dismissedAlerts).toEqual(["a"]);
  });

  it("repairs log entries from older saves that lack the symptom lists", () => {
    const s = parseSnapshot(
      JSON.stringify({
        entries: [{ id: "a", text: "febre", at: 1, source: "typed" }, null, { id: "b", text: "", at: 2, source: "action", findings: ["fever"], resolved: ["fever"] }],
        findings: [{ id: "fever", severity: 2, regions: ["head"], reportedAt: 1, evidence: "febre" }, { severity: 1 }, null],
      }),
    )!;
    expect(s.entries).toHaveLength(2);
    expect(s.entries[0].findings).toEqual([]);
    expect(s.entries[0].resolved).toEqual([]);
    expect(s.entries[1].resolved).toEqual(["fever"]);
    expect(s.findings.map((f) => f.id)).toEqual(["fever"]);
  });

  it("keeps the findings a general all-clear closed, and leaves older entries without the field", () => {
    const s = parseSnapshot(
      JSON.stringify({
        entries: [
          { id: "a", text: "estou bem", at: 2, source: "typed", findings: [], resolved: [], cleared: ["nausea", "old_symptom"] },
          { id: "b", text: "enjoo", at: 1, source: "typed", findings: ["nausea"], resolved: [] },
        ],
      }),
    )!;
    expect(s.entries[0].cleared).toEqual(["nausea"]);
    expect(s.entries[1]).not.toHaveProperty("cleared");
  });

  it("drops symptoms this version no longer knows, which have no labels", () => {
    const s = parseSnapshot(
      JSON.stringify({
        findings: [{ id: "old_symptom", severity: 1, regions: [], reportedAt: 1, evidence: "" }],
        entries: [{ id: "a", text: "x", at: 1, source: "typed", findings: ["old_symptom", "fever"], resolved: [] }],
      }),
    )!;
    expect(s.findings).toEqual([]);
    expect(s.entries[0].findings).toEqual(["fever"]);
  });
});
