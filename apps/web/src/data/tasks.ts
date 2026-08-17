import "server-only";
import { getDatabasePool } from "@/data/db";
import { parseTaskInput, validTaskId } from "@/data/task-core";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createAccountTask(value: unknown, actorValue: string) {
  const input = parseTaskInput(value);
  const actor = actorValue.trim().toLowerCase();
  if (!EMAIL.test(actor)) throw new Error("A valid assignee is required.");
  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const task = await client.query<{ id: string }>(
      `INSERT INTO crm_tasks (account_id,title,description,assignee_email,due_at)
       SELECT id,$2,$3,$4,$5 FROM accounts WHERE id=$1 RETURNING id::text`,
      [input.accountId,input.title,input.description,actor,input.dueAt],
    );
    if (!task.rowCount) { await client.query("ROLLBACK"); return { status: "account_not_found" as const }; }
    await client.query(
      `INSERT INTO activity_events (account_id,actor_email,event_type,details)
       VALUES ($1,$2,'task_created',jsonb_build_object('taskId',$3::text,'title',$4::text))`,
      [input.accountId,actor,task.rows[0].id,input.title],
    );
    await client.query("COMMIT");
    return { status: "created" as const };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function completeAccountTask(taskId: string, actorValue: string) {
  if (!validTaskId(taskId)) throw new Error("A valid task is required.");
  const actor = actorValue.trim().toLowerCase();
  if (!EMAIL.test(actor)) throw new Error("A valid actor is required.");
  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const task = await client.query<{ account_id: string; title: string }>(
      `UPDATE crm_tasks SET status='completed',updated_at=now()
       WHERE id=$1 AND status IN ('open','in_progress') RETURNING account_id::text,title`,[taskId]);
    if (!task.rowCount) { await client.query("ROLLBACK"); return { status: "not_found" as const }; }
    await client.query(
      `INSERT INTO activity_events (account_id,actor_email,event_type,details)
       VALUES ($1,$2,'task_completed',jsonb_build_object('taskId',$3::text,'title',$4::text))`,
      [task.rows[0].account_id,actor,taskId,task.rows[0].title]);
    await client.query("COMMIT");
    return { status: "completed" as const, accountId: task.rows[0].account_id };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
