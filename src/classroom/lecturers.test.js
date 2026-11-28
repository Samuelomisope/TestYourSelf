import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LECTURERS, pickLecturer } from "./lecturers.js";

describe("pickLecturer", () => {
  it("prefers the student's own choice", () => assert.equal(pickLecturer("MALE", "FEMALE"), "MALE"));
  it("falls back to the lesson's tutor voice", () => assert.equal(pickLecturer("", "MALE"), "MALE"));
  it("defaults to the female lecturer for anything unknown", () => {
    for (const bad of [undefined, null, "", "robot", 3]) assert.equal(pickLecturer(bad, bad), "FEMALE");
  });
  it("gives both lecturers a name and voice, and no 3D model yet", () => {
    for (const lecturer of Object.values(LECTURERS)) {
      assert.ok(lecturer.name && lecturer.voice);
      assert.equal(lecturer.vrmUrl, null);
    }
    assert.notEqual(LECTURERS.FEMALE.name, LECTURERS.MALE.name);
  });
});
