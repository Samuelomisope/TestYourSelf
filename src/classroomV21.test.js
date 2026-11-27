import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readV21Switch, resolveV21, V21_STORAGE_KEY } from "./classroomV21.js";

const memory = () => {
  const data = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; }, removeItem: (k) => { delete data[k]; } };
};

describe("classroom 2.1 switch", () => {
  it("is off by default", () => {
    assert.equal(resolveV21({ buildFlag: false, stored: null }), false);
  });
  it("is on when the build flag is on", () => {
    assert.equal(resolveV21({ buildFlag: true, stored: null }), true);
  });
  it("turns on privately with ?classroom21=on and remembers it", () => {
    const s = memory();
    assert.equal(readV21Switch("?classroom21=on", s), "on");
    assert.equal(readV21Switch("", s), "on");
    assert.equal(s.getItem(V21_STORAGE_KEY), "on");
  });
  it("turns off with ?classroom21=off", () => {
    const s = memory();
    readV21Switch("?classroom21=on", s);
    assert.equal(readV21Switch("?classroom21=off", s), null);
  });
  it("ignores other values and a missing storage", () => {
    assert.equal(readV21Switch("?classroom21=yes", memory()), null);
    assert.equal(readV21Switch("?classroom21=on", null), "on");
  });
});
