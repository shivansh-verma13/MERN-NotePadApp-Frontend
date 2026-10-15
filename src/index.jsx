import React from "react";
import { createRoot } from "react-dom/client";
import { routes } from "./routes";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";

const router = createBrowserRouter(routes);

const root = createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-left" />
    </AuthProvider>
  </React.StrictMode>
);
