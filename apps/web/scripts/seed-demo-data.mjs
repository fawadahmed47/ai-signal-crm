import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const sourceName = "AI Signal CRM Curated Market Dataset";
const sourceUrl = null;
const companies = [
  ["Northstar Data Campus", "northstar data campus", "https://northstar-demo.example", "CH"],
  ["Helio Compute", "helio compute", "https://helio-demo.example", "DE"],
  ["Vertex Cloud", "vertex cloud", "https://vertex-demo.example", "GB"],
  ["Meridian AI Infrastructure", "meridian ai infrastructure", "https://meridian-demo.example", "NL"],
];

async function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = await readFile(new URL("../../../.env", import.meta.url), "utf8");
  const line = env.split(/\r?\n/).find((value) => value.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL is not set in .env");
  return line.slice("DATABASE_URL=".length).trim();
}

async function clearDemoData(client) {
  const source = await client.query("SELECT id FROM signal_sources WHERE name=$1", [sourceName]);
  if (!source.rowCount) return;
  const sourceId = source.rows[0].id;
  await client.query(
    `WITH demo_signals AS (SELECT id FROM signals WHERE source_id=$1),
          demo_accounts AS (SELECT id FROM accounts WHERE created_from_signal_id IN (SELECT id FROM demo_signals)),
          demo_opportunities AS (SELECT id FROM opportunities WHERE account_id IN (SELECT id FROM demo_accounts))
     DELETE FROM activity_events WHERE signal_id IN (SELECT id FROM demo_signals)
       OR account_id IN (SELECT id FROM demo_accounts) OR opportunity_id IN (SELECT id FROM demo_opportunities)`, [sourceId],
  );
  await client.query("DELETE FROM opportunities WHERE account_id IN (SELECT id FROM accounts WHERE created_from_signal_id IN (SELECT id FROM signals WHERE source_id=$1))", [sourceId]);
  await client.query("DELETE FROM accounts WHERE created_from_signal_id IN (SELECT id FROM signals WHERE source_id=$1)", [sourceId]);
  await client.query("DELETE FROM signals WHERE source_id=$1", [sourceId]);
  await client.query("DELETE FROM companies WHERE normalized_name = ANY($1::text[])", [companies.map((company) => company[1])]);
  await client.query("DELETE FROM signal_sources WHERE id=$1", [sourceId]);
}

async function loadDemoData(client) {
  const source = await client.query("INSERT INTO signal_sources (name,source_type,source_url) VALUES ($1,'manual',$2) RETURNING id", [sourceName, sourceUrl]);
  const companyIds = new Map();
  for (const [name, normalized, website, country] of companies) {
    const result = await client.query("INSERT INTO companies (canonical_name,normalized_name,website,country_code) VALUES ($1,$2,$3,$4) RETURNING id", [name, normalized, website, country]);
    companyIds.set(normalized, result.rows[0].id);
  }

  const signals = [
    ["northstar data campus", "northstar-180mw", "pending", 92, "Northstar Data Campus announces a 180 MW expansion in Zurich", "capacity expansion", "Northstar is planning a new Zurich campus phase with 180 MW of additional capacity and a target opening next year.", "Large near-term capacity expansion, a named location, and a clear delivery timeline make this a high-value commercial signal.", "Zurich, Switzerland"],
    ["helio compute", "helio-gpu-cluster", "pending", 81, "Helio Compute seeks infrastructure partners for GPU cluster rollout", "ai infrastructure", "Helio is evaluating power, cooling, and colocation partners for a GPU cluster deployment in Frankfurt.", "The request identifies a concrete infrastructure need and an active buying process with a named deployment region.", "Frankfurt, Germany"],
    ["vertex cloud", "vertex-platform", "approved", 78, "Vertex Cloud launches a European AI platform capacity programme", "product launch", "Vertex has approved an expansion programme and opened a supplier evaluation.", "An approved programme and supplier evaluation indicate a well-qualified opportunity with evidence of commercial intent.", "London, United Kingdom"],
    ["meridian ai infrastructure", "meridian-rumour", "rejected", 38, "Meridian AI Infrastructure explores future regional capacity options", "market research", "Meridian has mentioned potential long-term expansion without a specific project or timeline.", "The source lacks a committed project, timing, or identifiable commercial buying motion.", "Amsterdam, Netherlands"],
  ];
  const signalIds = new Map();
  for (const [company, externalId, status, score, title, category, summary, explanation, location] of signals) {
    const result = await client.query(
      `INSERT INTO signals (source_id,company_id,external_id,title,category,summary,location_text,power_capacity_mw,occurred_at,published_at,imported_at,status,opportunity_score,score_explanation,raw_payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now()-interval '2 days',now()-interval '2 days',now()-interval '2 days',$9,$10,$11,$12::jsonb) RETURNING id`,
      [source.rows[0].id, companyIds.get(company), externalId, title, category, summary, location, company === "northstar data campus" ? 180 : null, status, score, explanation, JSON.stringify({ demo: true, externalId })],
    );
    const signalId = result.rows[0].id;
    signalIds.set(company, signalId);
    await client.query("INSERT INTO signal_evidence (signal_id,url,label,excerpt) VALUES ($1,$2,$3,$4)", [signalId, `demo://${externalId}`, "Curated reference scenario", summary]);
  }

  const accountIds = new Map();
  for (const [company, stage] of [["northstar data campus", "prospect"], ["helio compute", "active"], ["vertex cloud", "active"]]) {
    const result = await client.query("INSERT INTO accounts (company_id,owner_email,lifecycle_stage,created_from_signal_id) VALUES ($1,'jamie.smith@example.com',$2,$3) RETURNING id", [companyIds.get(company), stage, signalIds.get(company)]);
    accountIds.set(company, result.rows[0].id);
  }

  const opportunityIds = new Map();
  for (const [company, name, stage, amount, probability, close] of [
    ["northstar data campus", "Zurich campus expansion", "qualified", 4200000, 60, "2026-11-30"],
    ["helio compute", "Frankfurt GPU cluster infrastructure", "identified", 1100000, 35, "2027-01-31"],
    ["vertex cloud", "European AI platform capacity programme", "proposal", 2500000, 75, "2026-10-15"],
  ]) {
    const result = await client.query("INSERT INTO opportunities (account_id,source_signal_id,name,stage,amount_usd,probability,owner_email,expected_close_date) VALUES ($1,$2,$3,$4,$5,$6,'jamie.smith@example.com',$7) RETURNING id", [accountIds.get(company), signalIds.get(company), name, stage, amount, probability, close]);
    opportunityIds.set(company, result.rows[0].id);
  }

  for (const [company, title, status, due] of [
    ["northstar data campus", "Book Northstar qualification call", "open", "2026-08-20"],
    ["helio compute", "Research Helio cooling requirements", "in_progress", "2026-08-14"],
    ["vertex cloud", "Send Vertex proposal follow-up", "completed", "2026-08-12"],
  ]) {
    await client.query("INSERT INTO crm_tasks (account_id,title,description,assignee_email,status,due_at) VALUES ($1,$2,'Created for the local demo.','jamie.smith@example.com',$3,$4::date)", [accountIds.get(company), title, status, due]);
  }
  for (const company of accountIds.keys()) {
    await client.query("INSERT INTO activity_events (account_id,opportunity_id,signal_id,actor_email,event_type,details) VALUES ($1,$2,$3,'jamie.smith@example.com','demo_data_loaded',$4::jsonb)", [accountIds.get(company), opportunityIds.get(company), signalIds.get(company), JSON.stringify({ message: "Local demo data loaded" })]);
  }
}

const pool = new Pool({ connectionString: await getDatabaseUrl() });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await clearDemoData(client);
  if (process.argv.includes("--clear")) {
    await client.query("COMMIT");
    console.log("Local demo data removed.");
  } else {
    await loadDemoData(client);
    await client.query("COMMIT");
    console.log("Local demo data loaded: 4 signals, 3 accounts, 3 opportunities, 3 tasks, and activity history.");
  }
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
