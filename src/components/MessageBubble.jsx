import React from "react";
import { Volume2 } from "lucide-react";
import { Button } from "./ui/button";

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40 animate-bounce [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40 animate-bounce [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40 animate-bounce" />
    </span>
  );
}

// Text with code blocks: the parts between ``` fences are shown as code, the rest as normal text. A block that is
// still being typed (no closing fence yet) already shows as code.
function MessageText({ text }) {
  return text.split(/(```[\s\S]*?(?:```|$))/).map((part, i) => {
    if (i % 2 === 0) {
      return part ? <span key={i} className="whitespace-pre-wrap break-words">{part}</span> : null;
    }
    const code = part.replace(/^```[^\n]*\n?/, "").replace(/```$/, "").replace(/\n$/, "");
    return (
      <pre key={i} className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs leading-snug text-slate-100">
        <code>{code}</code>
      </pre>
    );
  });
}

function MessageBubble({ author, at, children, onPlayAudio, isSpeaking }) {
  const isMe = author;
  // The bot bubble is inserted empty and filled in as the stream arrives -
  // while it's still empty, show a typing indicator instead of a blank bubble
  // with just a timestamp floating in it.
  const isWaitingForContent = !children;

  return (
    <div
      className={`flex  ${isMe == "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[65%] rounded-2xl px-3 py-2 shadow-sm ${
          isMe == "user"
            ? "bg-slate-900 text-white"
            : "bg-muted text-foreground"
        } `}
      >
        <div className="break-words leading-relaxed">
          {isWaitingForContent ? <TypingDots /> : typeof children === "string" ? <MessageText text={children} /> : children}
        </div>
        {!isWaitingForContent && (
          <div
            className={`mt-1 flex items-center gap-2 text-[10px] ${
              isMe == "user" ? "text-white/70" : "text-muted-foreground"
            }`}
          >
            <span>{at}</span>
            {isMe !== "user" && onPlayAudio && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={onPlayAudio}
                disabled={isSpeaking}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Play as speech"
              >
                <Volume2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
