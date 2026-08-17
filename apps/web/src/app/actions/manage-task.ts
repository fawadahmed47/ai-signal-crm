"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { completeAccountTask, createAccountTask } from "@/data/tasks";

export async function createTaskAction(value: { accountId: string; title: string; description?: string; dueAt?: string }) {
  try {
    const actor = process.env.REVIEWER_EMAIL?.trim();
    if (!actor) return { ok:false as const,message:"The server user identity is not configured." };
    const result = await createAccountTask(value,actor);
    if (result.status === "account_not_found") return { ok:false as const,message:"This account no longer exists." };
    revalidatePath(`/accounts/${value.accountId}`);
    return { ok:true as const,message:"Task created and activity recorded." };
  } catch (error) { return { ok:false as const,message:error instanceof Error ? error.message : "Task could not be created." }; }
}

export async function completeTaskAction(taskId: string) {
  try {
    const actor = process.env.REVIEWER_EMAIL?.trim();
    if (!actor) return { ok:false as const,message:"The server user identity is not configured." };
    const result = await completeAccountTask(taskId,actor);
    if (result.status === "not_found") return { ok:false as const,message:"This task is already closed or missing." };
    revalidatePath(`/accounts/${result.accountId}`);
    return { ok:true as const,message:"Task completed and activity recorded." };
  } catch (error) { return { ok:false as const,message:error instanceof Error ? error.message : "Task could not be completed." }; }
}
