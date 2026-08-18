"use client";

import { useState, useTransition } from "react";

import { addAccountNoteAction, addContactAction, updateContactEngagementAction } from "@/app/actions/manage-account-relations";
import type { AccountIntelligenceDTO } from "@/types/account";

type AccountRelationshipsProps = { accountId: string; initialContacts: AccountIntelligenceDTO["contacts"]; initialNotes: AccountIntelligenceDTO["notes"]; canEdit: boolean };

export function AccountRelationships({ accountId, initialContacts, initialNotes, canEdit }: AccountRelationshipsProps) {
  const [contacts, setContacts] = useState(initialContacts);
  const [notes, setNotes] = useState(initialNotes);
  const [showContact, setShowContact] = useState(false);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");

  function addContact(formData: FormData) {
    startTransition(async () => {
      const result = await addContactAction({ accountId, fullName: String(formData.get("fullName") ?? ""), jobTitle: String(formData.get("jobTitle") ?? ""), email: String(formData.get("email") ?? ""), phone: String(formData.get("phone") ?? ""), stakeholderRole: String(formData.get("stakeholderRole") ?? "other") });
      setNotice(result.message);
      if (result.ok) { setContacts((items) => [result.contact, ...items]); setShowContact(false); }
    });
  }

  function updateContact(contactId: string, engagementStatus: string) {
    startTransition(async () => {
      const result = await updateContactEngagementAction({ accountId, contactId, engagementStatus });
      setNotice(result.message);
      if (result.ok) setContacts((items) => items.map((contact) => contact.id === contactId ? { ...contact, engagementStatus: result.status, lastContactedAt: result.lastContactedAt } : contact));
    });
  }

  function addNote() {
    startTransition(async () => {
      const result = await addAccountNoteAction(accountId, note);
      setNotice(result.message);
      if (result.ok) { setNotes((items) => [result.note, ...items]); setNote(""); }
    });
  }

  return (
    <section className="relationship-grid" id="account-relationships">
      <article className="intelligence-panel">
        <header><div><p>Buying committee</p><h3>Contacts</h3></div><span>{contacts.length}</span></header>
        {canEdit ? <div className="relationship-toolbar"><button type="button" onClick={() => setShowContact((value) => !value)}>+ Add contact</button></div> : null}
        {showContact ? <form action={addContact} className="relationship-form"><input name="fullName" required placeholder="Full name" /><input name="jobTitle" placeholder="Job title" /><select name="stakeholderRole" defaultValue="other"><option value="decision_maker">Decision maker</option><option value="procurement">Procurement</option><option value="facilities">Facilities</option><option value="engineering">Engineering</option><option value="finance">Finance</option><option value="champion">Champion</option><option value="other">Other</option></select><input name="email" type="email" placeholder="Email" /><input name="phone" placeholder="Phone" /><button disabled={isPending}>Save contact</button></form> : null}
        <div className="relationship-list">{contacts.map((contact) => <div className="contact-card" key={contact.id}><div><strong>{contact.fullName}</strong><span>{contact.jobTitle ?? "Role not recorded"} · {contact.stakeholderRole.replaceAll("_", " ")}</span><small>{contact.email ?? contact.phone ?? "Contact details not recorded"}</small></div><label><span>Engagement</span><select value={contact.engagementStatus} disabled={!canEdit || isPending} onChange={(event) => updateContact(contact.id, event.target.value)}><option value="identified">Identified</option><option value="contacted">Contacted</option><option value="replied">Replied</option><option value="meeting_booked">Meeting booked</option><option value="not_a_fit">Not a fit</option></select></label>{contact.lastContactedAt ? <small>Last contact {new Date(contact.lastContactedAt).toLocaleDateString("en-GB")}</small> : null}</div>)}{!contacts.length ? <p>No contacts recorded yet.</p> : null}</div>
      </article>
      <article className="intelligence-panel">
        <header><div><p>Sales context</p><h3>Account notes</h3></div><span>{notes.length}</span></header>
        {canEdit ? <div className="note-composer"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add verified sales context or next-step notes" /><button type="button" onClick={addNote} disabled={isPending || note.trim().length < 2}>Add note</button></div> : null}
        <div className="relationship-list">{notes.map((item) => <div key={item.id}><strong>{item.authorName}</strong><span>{item.body}</span><small>{new Date(item.createdAt).toLocaleString("en-GB")}</small></div>)}{!notes.length ? <p>No account notes yet.</p> : null}</div>
      </article>
      {notice ? <p className="relationship-notice" role="status">{notice}</p> : null}
    </section>
  );
}
