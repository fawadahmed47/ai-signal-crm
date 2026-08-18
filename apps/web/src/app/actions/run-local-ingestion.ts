"use server";

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { revalidatePath } from "next/cache";

const execFileAsync = promisify(execFile);

type RunIngestionResult = { ok: true; message: string } | { ok: false; message: string };

export async function runLocalIngestionAction(): Promise<RunIngestionResult> {
  const repositoryRoot = path.resolve(process.cwd(), "../..");
  const python = process.platform === "win32"
    ? path.join(repositoryRoot, ".venv", "Scripts", "python.exe")
    : path.join(repositoryRoot, ".venv", "bin", "python");
  const pipeline = path.join(repositoryRoot, "services", "ingestion", "main.py");

  if (!existsSync(python) || !existsSync(pipeline)) {
    return { ok: false, message: "Local ingestion is not configured. Create the project Python environment before running an import." };
  }
  if (!process.env.DATABASE_URL) {
    return { ok: false, message: "DATABASE_URL is missing. Start the CRM with the local database configuration." };
  }

  try {
    await execFileAsync(python, [pipeline], {
      cwd: path.dirname(pipeline),
      env: { ...process.env, INGESTION_OUTPUTS: "postgres" },
      timeout: 180_000,
      maxBuffer: 1_000_000,
      windowsHide: true,
    });
    revalidatePath("/");
    revalidatePath("/accounts");
    revalidatePath("/opportunities");
    revalidatePath("/reports");
    return { ok: true, message: "Local import finished. New detected signals are now in the review queue." };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown ingestion error";
    return { ok: false, message: `Import did not finish. ${detail.slice(0, 180)}` };
  }
}
