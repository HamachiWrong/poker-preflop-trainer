import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import UploadRanges from "./pages/UploadRanges";
import Play from "./pages/Play";

const router = createBrowserRouter([
  { path: "/", element: <UploadRanges /> },
  { path: "/play", element: <Play /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);