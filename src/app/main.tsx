import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initialize } from "./store";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
void initialize();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
      })
      .catch((error: unknown) =>
        console.warn("Service worker registration failed", error),
      );
  });
}
