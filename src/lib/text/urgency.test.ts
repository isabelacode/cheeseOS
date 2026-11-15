import { describe, expect, it } from "vitest";
import { soundsMoreUrgent } from "./urgency";

describe("soundsMoreUrgent", () => {
  it("flags escalation phrases in pt and en, with or without accents", () => {
    expect(soundsMoreUrgent("Procure o médico de voo imediatamente.", "attention")).toBe(true);
    expect(soundsMoreUrgent("Isto é uma EMERGÊNCIA", "nominal")).toBe(true);
    expect(soundsMoreUrgent("isto e uma emergencia", "nominal")).toBe(true);
    expect(soundsMoreUrgent("Pare o exercício agora.", "nominal")).toBe(true);
    expect(soundsMoreUrgent("Contact the flight surgeon now.", "nominal")).toBe(true);
    expect(soundsMoreUrgent("Stop the exercise.", "nominal")).toBe(true);
  });

  it("flags 'immediate' as well as 'immediately'", () => {
    expect(soundsMoreUrgent("Seek immediate care from the crew medical officer.", "attention")).toBe(true);
  });

  it("does not flag advice that says it is not urgent", () => {
    expect(soundsMoreUrgent("Isso não é uma emergência; descanse e beba água.", "nominal")).toBe(false);
    expect(soundsMoreUrgent("Nao e urgente, mas registre se piorar.", "nominal")).toBe(false);
    expect(soundsMoreUrgent("This is not an emergency. Rest and hydrate.", "nominal")).toBe(false);
    expect(soundsMoreUrgent("It isn't urgent; log it if it gets worse.", "nominal")).toBe(false);
    expect(soundsMoreUrgent("No need to stop your routine.", "nominal")).toBe(false);
    expect(soundsMoreUrgent("Sem necessidade de interromper o treino.", "nominal")).toBe(false);
  });

  it("still flags an escalation that follows a negated phrase", () => {
    expect(soundsMoreUrgent("Não espere: chame o médico de voo.", "attention")).toBe(true);
    expect(soundsMoreUrgent("Don't wait. Call the flight surgeon.", "attention")).toBe(true);
  });

  it("never flags when the status is already critical", () => {
    expect(soundsMoreUrgent("Emergency!", "critical")).toBe(false);
  });
});
