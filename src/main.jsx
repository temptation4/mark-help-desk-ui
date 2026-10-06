import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import ChatHome from "./pages/ChatHome.jsx";
import Chat from "./pages/Chat.jsx";
import Login from "./pages/Login.jsx";
import RequireAuth from "./components/RequireAuth.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* everything below needs a logged-in user */}
        <Route path="/" element={<RequireAuth><ChatHome /></RequireAuth>} />
        <Route path="/chat/:conversationId" element={<RequireAuth><Chat /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
