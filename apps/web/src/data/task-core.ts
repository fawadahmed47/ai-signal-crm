const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseTaskInput(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Task input is required.");
  const item=value as Record<string,unknown>; const accountId=typeof item.accountId==="string"?item.accountId.trim():""; const title=typeof item.title==="string"?item.title.trim():""; const description=typeof item.description==="string"?item.description.trim():""; const dueAt=typeof item.dueAt==="string"&&item.dueAt?item.dueAt:null;
  if(!UUID.test(accountId))throw new Error("A valid account is required."); if(!title||title.length>200)throw new Error("Task title must contain 1–200 characters."); if(description.length>2000)throw new Error("Task description cannot exceed 2,000 characters."); if(dueAt&&Number.isNaN(new Date(dueAt).getTime()))throw new Error("Task due date is invalid."); return{accountId,title,description:description||null,dueAt};
}
export function validTaskId(value:string){return UUID.test(value);}
