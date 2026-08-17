import assert from "node:assert/strict";
import test from "node:test";

import { composeOutreachDraft } from "./outreach-core";

test("generates an evidence-grounded outreach draft", () => {
  const draft = composeOutreachDraft({
    companyName: "Acme Data",
    signalTitle: "Announced a new data center campus",
    signalSummary: "The project includes 40 MW of capacity.",
    opportunityName: "Campus infrastructure program",
  });
  assert.match(draft.subject, /Acme Data/);
  assert.match(draft.body, /40 MW/);
  assert.match(draft.body, /Campus infrastructure program/);
  assert.equal(draft.body.includes("send"), false);
});

test("requires retained company and signal facts", () => {
  assert.throws(() => composeOutreachDraft({ companyName: "", signalTitle: "Test", signalSummary: "Test" }), /Company name/);
  assert.throws(() => composeOutreachDraft({ companyName: "Acme", signalTitle: "", signalSummary: "Test" }), /Signal title/);
});
