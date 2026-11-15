import { describe, expect, it } from "vitest";
import { LOCALES } from "@/lib/i18n/locale";
import { extractSymptoms } from "./symptoms";
import { TOUCH_OPTIONS } from "./touch";
import { REGIONS } from "./types";

describe("touch reporting", () => {
  for (const region of REGIONS) {
    for (const option of TOUCH_OPTIONS[region]) {
      for (const locale of LOCALES) {
        it(`${region}/${option.id}/${locale}: the phrase is recognized as that symptom`, () => {
          const found = extractSymptoms(option.phrase[locale], locale).findings;
          expect(found.map((f) => f.id)).toContain(option.id);
        });
      }
    }
  }

  it("limb phrases land on the tapped side", () => {
    for (const region of ["leftArm", "rightArm", "leftLeg", "rightLeg"] as const) {
      for (const option of TOUCH_OPTIONS[region]) {
        for (const locale of LOCALES) {
          const found = extractSymptoms(option.phrase[locale], locale).findings.find((f) => f.id === option.id);
          expect(found?.regions, `${region}/${option.id}/${locale}`).toContain(region);
        }
      }
    }
  });
});
