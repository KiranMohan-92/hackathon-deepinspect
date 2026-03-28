import React from "react";
import ReactDOM from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./index.css";
import App from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found in document");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
