import React from "react";
import App from "../App";
import { ToastProvider } from "../useToast";

export default function Page() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}
