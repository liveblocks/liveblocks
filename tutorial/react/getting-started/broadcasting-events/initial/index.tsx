import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import App from "./App";
import { ToastProvider } from "@/useToast";

{% DEFAULT_SCRIPTS %}

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
);
