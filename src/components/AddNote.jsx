import React, { useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import { createNote } from "../helpers/api-communicators";
export default function AddNote({addNote, saveNote = createNote, disabled = false}) {
  const [note,setNote]=useState({title:"",content:""});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [uncertain,setUncertain]=useState(false);
  const attempt=useRef(null);
  const pending=useRef(false);
  async function save(event) {
    event.preventDefault();
    if(pending.current || disabled) return;
    if(!note.title.trim() || !note.content.trim()) {setError("Add a title and some content before saving.");return;}
    pending.current=true;setBusy(true);setError("");
    try {
      if (!attempt.current) attempt.current={...note,key:`${Date.now()}.${crypto.randomUUID()}`};
      const response=await saveNote(attempt.current.title,attempt.current.content,attempt.current.key);
      addNote?.(response);setNote({title:"",content:""});attempt.current=null;setUncertain(false);
    } catch(error) {
      const status=error.response?.status;
      const unknown=uncertain || !status || status===408 || status>=500 || error.response?.data?.code==="CREATE_RETRY_EXPIRED";
      setUncertain(unknown);
      if(!unknown) attempt.current=null;
      setError(error.response?.data?.message || "Unable to confirm whether your note was saved. Your draft is still here; retry the same save safely.");
    }
    finally {pending.current=false;setBusy(false);}
  }
  return <form className="addNote" onSubmit={save} aria-label="Create note" aria-busy={busy}>
    <label htmlFor="note-title">Title</label>
    <input id="note-title" className="title" name="title" value={note.title} maxLength={120} disabled={busy} readOnly={uncertain} aria-describedby={uncertain ? "create-retry-help" : undefined} onChange={event=>setNote({...note,title:event.target.value})} />
    <label htmlFor="note-content">Content</label>
    <textarea id="note-content" className="content" name="content" rows={3} value={note.content} maxLength={20000} disabled={busy} readOnly={uncertain} aria-describedby={uncertain ? "create-retry-help" : undefined} onChange={event=>setNote({...note,content:event.target.value})} />
    {uncertain && <p id="create-retry-help" role="status">Keep this page open and draft unchanged while retrying. The server may already have saved it. Retry uses the same request for up to 24 hours; check your library if that window expires.</p>}
    {error && <p role="alert">{error}</p>}
    <button type="submit" disabled={busy || disabled} aria-label={busy ? "Saving note" : "Save note"}><AddIcon aria-hidden="true" />{busy ? "Saving…" : "Save"}</button>
  </form>;
}
