import React from "react";
import ReactDOM from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./index.css";
import App from "./App";

try {
  const raw = window.localStorage.getItem("deepinspect-store");
  const persisted = raw ? JSON.parse(raw) : null;
  const theme = persisted?.state?.theme;
  if (theme === "light" || theme === "dark") {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }
} catch {
  // Ignore malformed persisted UI state and fall back to the default theme.
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
