import assert from "node:assert/strict";
import test from "node:test";
import { parseTaskInput } from "./task-core";

const ACCOUNT_ID="11111111-1111-4111-8111-111111111111";
test("validates and normalizes task input",()=>{assert.deepEqual(parseTaskInput({accountId:ACCOUNT_ID,title:" Follow up ",description:" Confirm timing "}),{accountId:ACCOUNT_ID,title:"Follow up",description:"Confirm timing",dueAt:null});});
test("rejects invalid task input",()=>{assert.throws(()=>parseTaskInput({accountId:"bad",title:""}),/valid account/);assert.throws(()=>parseTaskInput({accountId:ACCOUNT_ID,title:"x".repeat(201)}),/1–200/);});
