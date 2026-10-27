import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
const LineApp = lazy(() => import("./line/LineApp.tsx"));

const path = window.location.pathname;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {path.startsWith("/member") || path.startsWith("/staff") ? (
      <Suspense fallback={null}>
        <LineApp mode={path.startsWith("/staff") ? "staff" : "member"} />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
