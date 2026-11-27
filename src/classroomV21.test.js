import { describe, expect, it } from "vitest";
import { readV21Switch, resolveV21, V21_STORAGE_KEY } from "./classroomV21";

const memory = () => {
  const data = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; }, removeItem: (k) => { delete data[k]; } };
};

describe("classroom 2.1 switch", () => {
  it("is off by default", () => {
    expect(resolveV21({ buildFlag: false, stored: null })).toBe(false);
  });
  it("is on when the build flag is on", () => {
    expect(resolveV21({ buildFlag: true, stored: null })).toBe(true);
  });
  it("turns on privately with ?classroom21=on and remembers it", () => {
    const s = memory();
    expect(readV21Switch("?classroom21=on", s)).toBe("on");
    expect(readV21Switch("", s)).toBe("on");
    expect(s.getItem(V21_STORAGE_KEY)).toBe("on");
  });
  it("turns off with ?classroom21=off", () => {
    const s = memory();
    readV21Switch("?classroom21=on", s);
    expect(readV21Switch("?classroom21=off", s)).toBeNull();
  });
  it("ignores other values and a missing storage", () => {
    expect(readV21Switch("?classroom21=yes", memory())).toBeNull();
    expect(readV21Switch("?classroom21=on", null)).toBe("on");
  });
});
