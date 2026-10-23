import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./shared/ErrorBoundary";
import AuthGate from "./app/session/AuthGate";
import { auth, repository } from "./lib/supabase";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthGate auth={auth} repository={repository}>
          <App />
        </AuthGate>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
