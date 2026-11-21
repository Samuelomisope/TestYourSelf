import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_MODEL_BYTES, modelAvailable, modelUrl } from "./avatarModel.js";

const reply = (status, headers = {}) => async () => ({ ok: status >= 200 && status < 300, headers: { get: (name) => headers[name.toLowerCase()] ?? null } });

describe("modelUrl", () => {
  it("points at the male or female file and defaults to female", () => {
    assert.equal(modelUrl("MALE"), "/tutors/male.vrm");
    assert.equal(modelUrl("FEMALE"), "/tutors/female.vrm");
    for (const other of [undefined, null, "", "other"]) assert.equal(modelUrl(other), "/tutors/female.vrm");
  });
});

describe("modelAvailable", () => {
  it("accepts a real binary file of sensible size", async () => {
    assert.equal(await modelAvailable("/x.vrm", reply(200, { "content-type": "model/gltf-binary", "content-length": "4000000" })), true);
    assert.equal(await modelAvailable("/x.vrm", reply(200, { "content-type": "application/octet-stream" })), true);
  });
  it("rejects a missing file, an HTML fallback page and an oversized file", async () => {
    assert.equal(await modelAvailable("/x.vrm", reply(404)), false);
    assert.equal(await modelAvailable("/x.vrm", reply(200, { "content-type": "text/html; charset=utf-8" })), false);
    assert.equal(await modelAvailable("/x.vrm", reply(200, { "content-length": String(MAX_MODEL_BYTES + 1) })), false);
  });
  it("sends a HEAD request and never throws", async () => {
    let method;
    await modelAvailable("/x.vrm", async (_url, options) => { method = options.method; return { ok: false }; });
    assert.equal(method, "HEAD");
    assert.equal(await modelAvailable("/x.vrm", async () => { throw new Error("offline"); }), false);
    assert.equal(await modelAvailable("/x.vrm", async () => null), false);
    assert.equal(await modelAvailable("/x.vrm", undefined), false);
  });
});
