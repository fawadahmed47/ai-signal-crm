"use client";
import { CheckCircle, Plus, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState,useTransition } from "react";
import { completeTaskAction,createTaskAction } from "@/app/actions/manage-task";
import type { AccountIntelligenceDTO } from "@/types/account";

export function AccountTasks({accountId,tasks}:{accountId:string;tasks:AccountIntelligenceDTO["tasks"]}) {
  const router=useRouter(); const [open,setOpen]=useState(false); const [pending,startTransition]=useTransition();
  const [notice,setNotice]=useState<{message:string;error:boolean}|null>(null);
  function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);startTransition(async()=>{const result=await createTaskAction({accountId,title:String(data.get("title")??""),description:String(data.get("description")??""),dueAt:String(data.get("dueAt")??"")});setNotice({message:result.message,error:!result.ok});if(result.ok){setOpen(false);router.refresh();}});}
  function complete(id:string){startTransition(async()=>{const result=await completeTaskAction(id);setNotice({message:result.message,error:!result.ok});if(result.ok)router.refresh();});}
  return <section className="intelligence-panel task-panel" id="tasks"><header><div><p>Next actions</p><h3>Tasks</h3></div><span>{tasks.length}</span></header>
    <div className="task-toolbar"><p>Create accountable follow-up work. Every change is written to activity history.</p><button className="button button-primary" type="button" onClick={()=>setOpen(!open)}><Plus size={16}/>New task</button></div>
    {notice?<div className={`outreach-notice ${notice.error?"error":""}`}>{notice.error?<X size={16}/>:<CheckCircle size={16}/>}<span>{notice.message}</span></div>:null}
    {open?<form className="task-form" onSubmit={submit}><label>Title<input name="title" required maxLength={200}/></label><label>Due date<input name="dueAt" type="datetime-local"/></label><label className="wide">Description<textarea name="description" maxLength={2000}/></label><button className="button button-primary" disabled={pending}>{pending?"Saving…":"Create task"}</button></form>:null}
    {tasks.length?<div className="task-list">{tasks.map(task=><article key={task.id}><div><strong>{task.title}</strong><small>{task.assigneeEmail}{task.dueAt?` · Due ${new Date(task.dueAt).toLocaleDateString("en-GB")}`:""}</small>{task.description?<p>{task.description}</p>:null}</div><span className={`task-status ${task.status}`}>{task.status.replace("_"," ")}</span>{task.status==="open"||task.status==="in_progress"?<button type="button" disabled={pending} onClick={()=>complete(task.id)}><CheckCircle size={18}/>Complete</button>:null}</article>)}</div>:<p className="panel-empty">No tasks have been created.</p>}
  </section>;
}
