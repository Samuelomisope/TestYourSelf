import test from "node:test";
import assert from "node:assert/strict";
import { BUTTON_SIZES, BUTTON_VARIANTS, buttonClasses, cardClasses } from "./buttonStyles.js";

test("every button size keeps a 44px touch target", () => {
  for (const [name, classes] of Object.entries(BUTTON_SIZES)) assert.match(classes, /min-h-1[12]/, name);
});

test("unknown variant and size fall back to primary and md", () => {
  const out = buttonClasses({ variant: "nope", size: "huge" });
  assert.ok(out.includes(BUTTON_VARIANTS.primary));
  assert.ok(out.includes(BUTTON_SIZES.md));
});

test("block adds full width and className is appended last", () => {
  const out = buttonClasses({ block: true, className: "mt-4" });
  assert.ok(out.includes("w-full"));
  assert.ok(out.endsWith("mt-4"));
});

test("primary uses white text on a violet fill dark enough to read", () => {
  assert.match(BUTTON_VARIANTS.primary, /bg-violet-600/);
  assert.match(BUTTON_VARIANTS.primary, /text-white/);
});

test("cards have one radius, a tone and a padding step", () => {
  assert.match(cardClasses(), /rounded-2xl/);
  assert.match(cardClasses({ tone: "elevated" }), /bg-bg-elevated/);
  assert.match(cardClasses({ tone: "accent" }), /bg-violet-500\/10/);
  assert.equal(cardClasses({ padding: "none" }).includes(" p-"), false);
  assert.match(cardClasses({ padding: "bogus" }), /p-5/);
});
