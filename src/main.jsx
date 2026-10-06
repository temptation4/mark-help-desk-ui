import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
} from "react-router-dom";

import ChatHome from "./pages/ChatHome.jsx";
import Chat from "./pages/Chat.jsx";
import Login from "./pages/Login.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import { DEMO } from "./lib/demo";
import DemoBadge from "./components/DemoBadge.jsx";

// The hosted demo lives on GitHub Pages, which has no server rewrites, so it uses #/ URLs.
const Router = DEMO ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Router>
      <DemoBadge />
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* everything below needs a logged-in user */}
        <Route path="/" element={<RequireAuth><ChatHome /></RequireAuth>} />
        <Route path="/chat/:conversationId" element={<RequireAuth><Chat /></RequireAuth>} />
      </Routes>
    </Router>
  </StrictMode>
);
