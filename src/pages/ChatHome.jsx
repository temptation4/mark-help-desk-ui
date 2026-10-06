import React from "react";
import { Button } from "../components/ui/button";
import RoamingRobot from "../components/RoamingRobot";
import { useNavigate } from "react-router-dom";

function ChatHome() {
  const navigate = useNavigate();

  const handleStartClick = () => {
    navigate("/chat/new");
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col justify-center items-center gap-6">
      {/* Mark turns up from a random edge of the screen, cheers, and wanders off again later */}
      <RoamingRobot baseMood="happy" stayFor={8000} />

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
