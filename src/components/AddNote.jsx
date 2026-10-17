import React, { useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import { createNote } from "../helpers/api-communicators";
export default function AddNote({addNote}) {
  const [note,setNote]=useState({title:"",content:""});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const pending=useRef(false);
  async function save(event) {
    event.preventDefault();
    if(pending.current) return;
    if(!note.title.trim() || !note.content.trim()) {setError("Add a title and some content before saving.");return;}
    pending.current=true;setBusy(true);setError("");
    try {
      const response=await createNote(note.title,note.content);
      addNote(response);setNote({title:"",content:""});
    } catch(error) {setError(error.response?.data?.message || "Your note was not saved. Your draft is still here; please retry.");}
    finally {pending.current=false;setBusy(false);}
  }
  return <form className="addNote" onSubmit={save} aria-label="Create note" aria-busy={busy}>
    <label htmlFor="note-title">Title</label>
    <input id="note-title" className="title" name="title" value={note.title} maxLength={120} disabled={busy} onChange={event=>setNote({...note,title:event.target.value})} />
    <label htmlFor="note-content">Content</label>
    <textarea id="note-content" className="content" name="content" rows={3} value={note.content} maxLength={20000} disabled={busy} onChange={event=>setNote({...note,content:event.target.value})} />
    {error && <p role="alert">{error}</p>}
    <button type="submit" disabled={busy} aria-label={busy ? "Saving note" : "Save note"}><AddIcon aria-hidden="true" />{busy ? "Saving…" : "Save"}</button>
  </form>;
}
