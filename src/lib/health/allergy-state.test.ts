import { describe, expect, it } from "vitest";
import { allergyItems, allergyState, allergyProfile, hasAllergies } from "./safety";

describe("allergy field state", () => {
  it("treats an empty field as unverified, not as no allergy", () => {
    expect(allergyState("")).toBe("unverified");
    expect(allergyState("   ")).toBe("unverified");
  });

  it("reads explicit 'no allergy' answers as none", () => {
    for (const v of ["Nenhuma", "nenhum", "Sem alergias conhecidas", "NKDA", "No known allergies", "none"]) {
      expect(allergyState(v), v).toBe("none");
      expect(hasAllergies(allergyProfile(v)), v).toBe(false);
    }
  });

  it("flags real allergens", () => {
    expect(allergyState("dipirona")).toBe("listed");
    expect(allergyState("látex")).toBe("listed");
  });

  it("splits recognized drugs from plain-text terms", () => {
    const items = allergyItems("dipirona, amendoim");
    expect(items.find((i) => /dipirona/i.test(i.word))?.recognized).toBe(true);
    expect(items.find((i) => /amendoim/i.test(i.word))?.recognized).toBe(false);
  });
});
