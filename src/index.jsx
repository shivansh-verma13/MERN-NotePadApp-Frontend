import React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import LandingPage from "./components/LandingPage";
import SignUp from "./components/SignUp";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/notes",
    element: <App />,
  },
  {
    path: "/auth",
    element: <SignUp />,
  },
  {
    path: "/*",
    element: <LandingPage />,
  },
]);

const root = createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-left" />
    </AuthProvider>
  </React.StrictMode>
);
