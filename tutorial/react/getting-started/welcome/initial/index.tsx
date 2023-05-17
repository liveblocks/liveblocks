import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import RealApp from "./RealApp";

{% DEFAULT_SCRIPTS %}

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <RealApp />
  </StrictMode>
);
