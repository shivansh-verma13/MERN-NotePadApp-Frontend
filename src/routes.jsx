import React from "react";
import App from "./components/App";
import LandingPage from "./components/LandingPage";
import SignUp from "./components/SignUp";

// Share the production route table with integration tests; authentication stays
// in the existing provider and screens rather than a second test-only guard.
export const routes = [
  { path: "/", element: <LandingPage /> },
  { path: "/notes", element: <App /> },
  { path: "/auth", element: <SignUp /> },
  { path: "/*", element: <LandingPage /> },
];
