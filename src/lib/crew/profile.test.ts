import { afterEach, describe, expect, it, vi } from "vitest";
import type { CrewProfile } from "./profile";

const profile: CrewProfile = {
  name: "Ana Souza", role: "Engenheira de voo", mission: "Ares III", age: 34, sex: "feminino", heightCm: 168, weightKg: 62,
  bloodType: "O+", restingHeartRate: 64, allergies: "dipirona", medications: "", conditions: "",
};

function fakeStorage(initial: Record<string, string> = {}, opts: { failSet?: boolean; failAll?: boolean } = {}) {
  const store = new Map(Object.entries(initial));
  const guard = () => {
    if (opts.failAll) throw new DOMException("blocked", "SecurityError");
  };
  vi.stubGlobal("window", {
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: {
      getItem: (k: string) => (guard(), store.get(k) ?? null),
      setItem: (k: string, v: string) => {
        guard();
        if (opts.failSet) throw new DOMException("full", "QuotaExceededError");
        store.set(k, v);
      },
      removeItem: (k: string) => (guard(), store.delete(k)),
    },
  });
  return store;
}

/** useSyncExternalStore's getSnapshot, reached through a fake React that records it. */
async function snapshot() {
  let getSnapshot: () => unknown = () => undefined;
  vi.doMock("react", () => ({ useSyncExternalStore: (_s: unknown, get: () => unknown) => ((getSnapshot = get), get()) }));
  const mod = await import("./profile");
  mod.useCrewProfile();
  return { mod, read: () => getSnapshot() as CrewProfile | null };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock("react");
  vi.resetModules();
});

describe("crew profile storage", () => {
  it("keeps a saved profile in memory when the quota is exceeded", async () => {
    fakeStorage({ "cheeseos.crew.v1": JSON.stringify({ ...profile, weightKg: 70 }) }, { failSet: true });
    const { mod, read } = await snapshot();
    mod.saveProfile(profile);
    expect(read()?.weightKg).toBe(62);
  });

  it("keeps a saved profile in memory when storage is blocked", async () => {
    fakeStorage({}, { failAll: true });
    const { mod, read } = await snapshot();
    mod.saveProfile(profile);
    expect(read()?.name).toBe("Ana Souza");
    mod.deleteProfile();
    expect(read()).toBeNull();
  });

  it("fills fields missing from an older saved profile instead of crashing consumers", async () => {
    fakeStorage({ "cheeseos.crew.v1": JSON.stringify({ name: "Ana", age: 34, heightCm: 168, weightKg: 62 }) });
    const { read } = await snapshot();
    const p = read()!;
    expect(p.allergies).toBe("");
    expect(p.medications).toBe("");
    expect(p.conditions).toBe("");
    expect(p.role).toBe("");
    expect(p.sex).toBe("nao_informado");
    expect(p.bloodType).toBe("");
    expect(p.restingHeartRate).toBe(68);
  });

  it("treats a stored value that is not a profile as no profile", async () => {
    for (const raw of ["null", "[]", '"x"', "{}", '{"name":"   "}']) {
      fakeStorage({ "cheeseos.crew.v1": raw });
      const { read } = await snapshot();
      expect(read(), raw).toBeNull();
      vi.resetModules();
    }
  });

  it("returns a stable snapshot for unchanged storage", async () => {
    fakeStorage({ "cheeseos.crew.v1": JSON.stringify(profile) });
    const { read } = await snapshot();
    expect(read()).toBe(read());
  });

  it("delete all data also clears routine and demo state held in memory when storage is blocked", async () => {
    fakeStorage({}, { failAll: true });
    const { mod } = await snapshot();
    const routine = await import("@/lib/routine/routine");
    const demo = await import("@/lib/demo");
    routine.setNotify(true);
    demo.setDemoMode(true);
    mod.deleteProfile();
    let notify: boolean | null = null;
    routine.updateRoutine((s) => ((notify = s.notify), s));
    expect(notify).toBe(false);
    expect(demo.readDemoMode()).toBe(false);
  });
});
