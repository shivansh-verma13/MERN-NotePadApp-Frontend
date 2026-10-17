import { api } from "./api-client";

export const userLogin = async (username, password) => {
  const res = await api.post("/user/login", { username, password });
  if (res.status !== 200) {
    throw new Error("Could Not Log In");
  }
  const data = await res.data;
  return data;
};

export const userSignUp = async (name, username, password) => {
  const res = await api.post("/user/register", { name, username, password });
  if (res.status !== 201) {
    throw new Error("Unable to Register User");
  }
  const data = await res.data;
  return data;
};

export const userLogout = async () => {
  const res = await api.post("/user/logout");
  if (res.status !== 200) {
    throw new Error("User Logout Failed");
  }
  const data = await res.data;
  return data;
};

export const checkAuth = async () => {
  const res = await api.get("/user/auth");
  if (res.status !== 200) {
    throw new Error("User Is not Authenticated");
  }
  const data = await res.data;
  return data;
};

export const createNote = async (title, content) => {
  const res = await api.post("/notes/newNote", { title, content });
  if (res.status !== 201) {
    throw new Error("Note Creation Failed");
  }
  const data = await res.data;
  return data;
};

export const getAllUserNotes = async () => {
  const res = await api.get("/notes/all-notes");
  if (res.status !== 200) {
    throw new Error("No Notes Available");
  }
  const data = await res.data;
  return data;
};

export const deleteUserNote = async (noteID) => {
  const res = await api.delete(`/notes/deleteNote/${noteID}`);
  if (res.status !== 200) {
    throw new Error("Unable to Delete Note");
  }
  const data = await res.data;
  return data;
};

export const updateUserNote = async (content, noteID) => {
  const res = await api.patch("/notes/updateNote", { content, noteID });
  if (res.status !== 200) {
    throw new Error("Unable to Update Note");
  }
  const data = await res.data;
  return data;
};
