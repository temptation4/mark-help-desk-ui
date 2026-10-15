import React from "react";
import { Button } from "../components/ui/button";
import RoamingRobot from "../components/RoamingRobot";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { currentEmail, logout } from "../lib/auth";
import { useServerUp } from "../lib/useServerUp";

function ChatHome() {
  const navigate = useNavigate();
  const serverUp = useServerUp("/api/v1/helpdesk/health"); // no server, no Mark

  const handleStartClick = () => {
    navigate("/chat/new");
  };

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-dvh w-full overflow-hidden flex flex-col justify-center items-center gap-6 px-4 text-center">
      {/* who is signed in, and a way to sign out */}
      {currentEmail() && (
        <div className="absolute right-4 top-4 flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{currentEmail()}</span>
          <Button onClick={handleSignOut} variant="outline" size="sm" className="gap-1.5 cursor-pointer">
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      )}

      {/* Mark turns up from a random edge of the screen, cheers, and wanders off again later */}
      {serverUp && <RoamingRobot baseMood="happy" stayFor={8000} />}

      <h1 className="text-4xl font-bold">
        Welcome to Help Desk System
      </h1>

      <p className="text-muted-foreground">Say hello, or just start a chat whenever you are ready.</p>

      <Button
        onClick={handleStartClick}
        className="cursor-pointer"
        variant="outline"
      >
        Start Getting Help
      </Button>
    </div>
  );
}

export default ChatHome;
