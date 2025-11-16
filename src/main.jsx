import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { MIDIProvider } from "./hooks/useMIDI";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MIDIProvider>
      <App />
    </MIDIProvider>
  </React.StrictMode>
);
