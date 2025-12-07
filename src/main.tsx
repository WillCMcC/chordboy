import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { MIDIProvider } from "./hooks/useMIDI";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <MIDIProvider>
      <App />
    </MIDIProvider>
  </React.StrictMode>
);
