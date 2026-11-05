import axios from "axios";

// Build-time URL override for separate previews; same-origin reverse proxy by default.
export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "/notepad",
  withCredentials: true,
  timeout: 15000,
  headers: { "X-Notes-Request": "1" },
});
