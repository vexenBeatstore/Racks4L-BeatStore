import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"..");
test("D1 migration contains core entities",()=>{const sql=fs.readFileSync(path.join(root,"migrations/0001_initial.sql"),"utf8");for(const name of ["users","beats","licenses","orders","order_items","purchases","sessions","site_settings","admin_logs"])assert.match(sql,new RegExp(`CREATE TABLE IF NOT EXISTS ${name}\\b`));});
test("frontend has no secret key literals",()=>{const source=fs.readFileSync(path.join(root,"frontend/js/api.js"),"utf8");assert.doesNotMatch(source,/service_role|SUPABASE_SECRET_KEY|TELEGRAM_BOT_TOKEN/i);});
test("worker contains server-side admin guards and purchase idempotency",()=>{const source=fs.readFileSync(path.join(root,"backend/src/index.js"),"utf8");assert.match(source,/async function requireAdmin/);assert.match(source,/INSERT OR IGNORE INTO purchases/);assert.match(source,/csrf_hash/);});
