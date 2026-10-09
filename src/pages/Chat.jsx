import React, { useEffect, useRef, useState } from "react";
import {
  Search, MoreVertical, Send, Plus, LogOut, Mic, Square, Headphones, X, MessageCircle, Wrench, GraduationCap, Bot, Check, ChevronUp,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Spinner } from "../components/ui/spinner";
import MessageBubble from "../components/MessageBubble";
import { streamMessagesToServer } from "../services/chat.service";
import InterviewPanel from "../components/InterviewPanel";
import { transcribeAudio, synthesizeSpeech } from "../services/voice.service";
import { useVoiceRecorder } from "../lib/audio";
import { currentEmail, logout } from "../lib/auth";
import { callsMark, detectMood, isTicketNews, reactToUser, stripStageDirections } from "../lib/mood";
import RoamingRobot from "../components/RoamingRobot";
import { useServerUp } from "../lib/useServerUp";
import {
  loadConversations,
  loadAgent,
  loadMessages,
  saveAgent,
  saveMessages,
  upsertConversation,
} from "../lib/conversations";
import { useNavigate, useParams } from "react-router-dom";

// The agents in the "Select agent" menu. "chat" is not an agent: it is the normal conversation.
// The id is what is sent to the backend in the Agent header (see Agent.java there). To add another
// agent, add an entry here and a matching value in Agent.java.
const AGENTS = [
  {
    id: "troubleshoot", label: "Troubleshoot", hint: "Diagnose a problem and open or update a ticket",
    placeholder: "Describe your problem...", Icon: Wrench,
  },
  {
    id: "interview", label: "Interview prep", hint: "Practise mock interviews and get feedback on your answers",
    placeholder: "Tell me the role you are preparing for...", Icon: GraduationCap,
  },
];

function greetingMessage() {
  return [
    {
      id: crypto.randomUUID(),
      author: "bot",
      text: "Hello! How can I assist you?",
      at: new Date().toLocaleTimeString(),
    },
  ];
}

function Chat() {
  const serverUp = useServerUp("/api/v1/helpdesk/health"); // Mark is only here while the backend is running
  const { conversationId } = useParams();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  // Which agent answers: "chat" (normal conversation) or "troubleshoot" (support agent that can open tickets)
  const [agent, setAgent] = useState("chat");
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  // True after the user dragged Mark away: he stays off screen until a new chat, a new login, or the user says
  // something like "come robo" or "robo where are you".
  const [robotDismissed, setRobotDismissed] = useState(false);
  const selectedAgent = AGENTS.find((a) => a.id === agent) ?? null; // null while just chatting

  // Escape closes the "Select agent" menu.
  useEffect(() => {
    if (!agentMenuOpen) return;
    const onKeyDown = (event) => event.key === "Escape" && setAgentMenuOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [agentMenuOpen]);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [voiceError, setVoiceError] = useState(null);
  // Which mic button started the current recording - "text" (transcribe and
  // send, reply stays text) or "voice" (transcribe, send, and speak the
  // reply back), mirroring ChatGPT's separate dictate vs. voice-mode buttons.
  const [voiceMode, setVoiceMode] = useState(null);

  const endRef = useRef(null);
  const inputRef = useRef(null);
  const { isRecording, start: startRecording, stop: stopRecording } = useVoiceRecorder();
  const transcribeAbortRef = useRef(null);
  const currentAudioRef = useRef(null);

  // The robot's mood: running ("thinking") while a reply is on its way, then it reacts to how the
  // reply reads (laughs, cries - see lib/mood.js) and settles back to calm after a few seconds.
  const [calmedDown, setCalmedDown] = useState(false);
  const lastBot = [...messages].reverse().find((m) => m.author !== "user");

  // Bumped on every user action. <RoamingRobot> uses it to call Mark back if he has wandered off, and
  // to restart the timer after which he leaves.
  const [activity, setActivity] = useState(0);
  const wake = () => setActivity((n) => n + 1);

  // A gesture Mark should make right now, e.g. waving back when the user says hello. A new id plays it again.
  const [reaction, setReaction] = useState(null);

  // Mark's mood while he is standing there (see lib/mood.js for how text is judged):
  //  - running while he waits for the reply to start;
  //  - once words start appearing he "says" them: he stands and his mouth moves, until the reply is done;
  //  - listening while the user records, or types (but concerned if what is typed sounds like a problem);
  //  - otherwise he reacts to how the last reply reads (laughs, looks concerned) and calms down after a few seconds.
  const replyArriving = sending && !!lastBot?.text;
  let robotMood = "neutral";
  if (sending && !replyArriving) robotMood = "thinking";
  else if (replyArriving) robotMood = "neutral";
  else if (isRecording) robotMood = "listening";
  else if (draft.trim()) robotMood = ["sad", "hurt"].includes(reactToUser(draft)?.gesture) ? "sad" : "listening";
  else if (!calmedDown) robotMood = detectMood(lastBot?.text);

  useEffect(() => {
    if (sending || !lastBot?.text) return;
    const timer = setTimeout(() => setCalmedDown(true), 7000);
    return () => clearTimeout(timer);
  }, [sending, lastBot?.text]);

  // "/chat/new" (or no id at all) -> mint a fresh id and move the URL to it.
  // Everything else in this component only ever deals with a real id.
  useEffect(() => {
    if (!conversationId || conversationId === "new") {
      navigate(`/chat/${crypto.randomUUID()}`, { replace: true });
    }
  }, [conversationId, navigate]);

  // Load this conversation's history (or seed the greeting for a brand new
  // one) whenever the id in the URL changes - i.e. whenever the user opens a
  // different chat from the sidebar.
  useEffect(() => {
    if (!conversationId || conversationId === "new") return;

    const saved = loadMessages(conversationId);
    setMessages(saved && saved.length ? saved : greetingMessage());
    setAgent(loadAgent(conversationId));
    setConversations(loadConversations());
    inputRef.current?.focus();
  }, [conversationId]);

  function chooseAgent(next) {
    setAgent(next);
    saveAgent(conversationId, next);
    inputRef.current?.focus();
  }

  // Persist every change so refreshing the page, or coming back later, keeps
  // the conversation.
  useEffect(() => {
    if (!conversationId || conversationId === "new" || messages.length === 0) return;
    saveMessages(conversationId, messages);
  }, [conversationId, messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Shared by typed and voice input - the only difference is `autoSpeak`,
  // which reads the reply back out loud once it finishes streaming (voice
  // messages want a spoken reply; typed ones don't, unless you hit the
  // speaker icon yourself).
  async function sendMessage(text, { autoSpeak = false } = {}) {
    if (!text || sending) return;

    const isFirstMessage = messages.length <= 1;
    if (robotDismissed && callsMark(text)) setRobotDismissed(false); // "come robo": he comes back in
    setSending(true);
    setCalmedDown(false); // the robot reacts afresh to the coming reply
    wake(); // and comes back if he had wandered off
    // He reacts to what the user said, straight away: waves back, dances at thanks, looks concerned about
    // a problem, laughs at a joke, nods at a question, waves goodbye and leaves.
    // (Not in the interview agent: the words of an interview ANSWER, like "error" or "can't", are not about the user.)
    const userReaction = agent === "interview" ? null : reactToUser(text);
    if (userReaction) {
      setReaction({ id: crypto.randomUUID(), name: userReaction.gesture, leave: userReaction.leave });
    }
    setDraft("");

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), author: "user", text, at: new Date().toLocaleTimeString() },
    ]);

    // A placeholder bot bubble that gets filled in live as chunks arrive,
    // instead of waiting for the whole reply before showing anything.
    const botMessageId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: botMessageId, author: "bot", text: "", at: new Date().toLocaleTimeString() },
    ]);

    try {
      const fullReply = await streamMessagesToServer(text, conversationId, (soFar) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === botMessageId ? { ...m, text: soFar } : m))
        );
      }, agent);

      setConversations(
        upsertConversation(conversationId, {
          ...(isFirstMessage ? { title: text.slice(0, 40) } : {}),
          lastMessage: stripStageDirections(fullReply).slice(0, 60),
        })
      );

      // A ticket was created or updated: time to celebrate with him.
      if (isTicketNews(fullReply)) {
        setReaction({ id: crypto.randomUUID(), name: "dance" });
      }

      if (autoSpeak) {
        handlePlayAudio(botMessageId, fullReply);
      }
    } catch (err) {
      // fill in the same placeholder bubble rather than adding a second one
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMessageId
            ? { ...m, text: "Sorry, I couldn't reach the help desk right now. Please try again." }
            : m
        )
      );
      console.error(err);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function handleSend() {
    await sendMessage(draft.trim());
  }

  // Two voice buttons share this: stop recording -> transcribe -> send
  // immediately, no manual review/Send step. `mode` decides what happens to
  // the reply - "text" leaves it as a normal text bubble, "voice" also
  // speaks it back, like ChatGPT's dictate vs. voice-mode buttons.
  async function handleVoiceButtonClick(mode) {
    setVoiceError(null);

    if (isRecording) {
      if (voiceMode !== mode) return; // the other button is mid-recording - ignore

      const wavBlob = await stopRecording();
      setVoiceMode(null);
      if (!wavBlob) return;

      setTranscribing(true);
      const controller = new AbortController();
      transcribeAbortRef.current = controller;
      try {
        const text = await transcribeAudio(wavBlob, controller.signal);
        setTranscribing(false);
        if (text && text.trim()) {
          await sendMessage(text.trim(), { autoSpeak: mode === "voice" });
        }
      } catch (err) {
        setTranscribing(false);
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return; // user hit Cancel
        console.error(err);
        setVoiceError(
          `Transcription failed: ${err.response?.status ? `server returned ${err.response.status}` : err.message}`
        );
      } finally {
        transcribeAbortRef.current = null;
      }
    } else {
      try {
        wake(); // Mark comes to listen
        await startRecording();
        setVoiceMode(mode);
      } catch (err) {
        console.error("Microphone access failed", err);
        setVoiceError(
          err.name === "NotAllowedError"
            ? "Microphone permission was denied. Allow microphone access for this site in your browser (and in macOS System Settings > Privacy & Security > Microphone), then try again."
            : `Couldn't start recording: ${err.message}`
        );
      }
    }
  }

  async function handlePlayAudio(messageId, text) {
    setVoiceError(null);
    try {
      setSpeakingId(messageId);
      wake(); // Mark comes to read it out
      const url = await synthesizeSpeech(stripStageDirections(text));
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      audio.onended = () => {
        setSpeakingId(null);
        currentAudioRef.current = null;
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setSpeakingId(null);
        currentAudioRef.current = null;
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch (err) {
      console.error(err);
      setSpeakingId(null);
      setVoiceError(
        `Playback failed: ${err.response?.status ? `server returned ${err.response.status}` : err.message}`
      );
    }
  }

  // One button to back out of voice entirely, whatever stage it's at:
  // mid-recording (discard, don't transcribe), mid-transcription (abort the
  // request), or mid-playback (stop the reply being read out). Always lands
  // back in plain text mode with nothing sent.
  async function cancelVoice() {
    setVoiceError(null);

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setSpeakingId(null);
    }

    if (transcribeAbortRef.current) {
      transcribeAbortRef.current.abort();
    }

    if (isRecording) {
      await stopRecording(); // discard the returned blob - never transcribed
      setVoiceMode(null);
    }

    setTranscribing(false);
  }

  const voiceActive = isRecording || transcribing || speakingId !== null;

  const visibleConversations = conversations.filter(
    (c) =>
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessage?.toLowerCase().includes(search.toLowerCase())
  );

  if (!conversationId || conversationId === "new") {
    return null; // redirecting to a real id, nothing to render yet
  }

  return (
    <div className="fixed top-0 left-0 right-0  mx-auto min-h-screen max-w-7xl grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] border-x ">
      <div>
        {/* Sidebar */}

        <aside className="hidden md:flex md:flex-col border-r">
          <div className="p-3 flex items-center gap-2">
            <Button
              size={"icon"}
              variant={"outline"}
              className={"h-8 w-8"}
              onClick={() => {
                setRobotDismissed(false); // a new chat calls Mark back
                navigate("/chat/new");
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <div className="relative  w-full">
              <input
                placeholder="Search Chats..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9  w-full pl-8 border rounded"
              />
              <Search className="h-4 w-4  pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <Separator />
          <ScrollArea className="flex-1">
            <ul className="p-2 space-y-1">
              {visibleConversations.length === 0 ? (
                <li className="px-3 py-2 text-xs text-muted-foreground">
                  No conversations yet - click + to start one.
                </li>
              ) : (
                visibleConversations.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => navigate(`/chat/${c.id}`)}
                      className={`w-full rounded-xl px-3 py-2 text-left hover:bg-accent transition ${
                        c.id === conversationId ? "bg-accent" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src="" alt={c.title} />
                          <AvatarFallback className="text-xs">
                            {c.title?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {c.title || "New chat"}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.lastMessage}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </ScrollArea>
        </aside>
      </div>
      {/* right chat area */}
      <section className="relative flex h-screen flex-col border-l">
        {/* Chat Area */}

        {/* header */}

        <div className="flex   items-center justify-between  gap-3 px-4 py-3 border-b">
          <div className="flex gap-3">
            <div className="leading-tight ">
              <div className="text-sm font-medium">Mark · Help Desk Assistant</div>
              <div className="text-xs text-muted-foreground">GeekNova Technologies</div>
            </div>
          </div>

          <div className="flex items-center">
            <span className="mr-2 hidden text-xs text-muted-foreground sm:inline">
              {currentEmail()}
            </span>
            <Button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              title="Sign out"
              variant={"ghost"}
              size={"icon"}
              className={"h-8 w-8"}
            >
              <LogOut className={"h-4 w-3"} />
            </Button>
            <Button variant={"ghost"} size={"icon"} className={"h-8 w-8"}>
              <MoreVertical className={"h-4 w-3"} />
            </Button>
          </div>
        </div>

        {/* Mark floats above the page: he turns up from a random edge, stands somewhere for a while and
            leaves again. He takes no space, so the chat always keeps its full width. */}
        {serverUp && <RoamingRobot
          baseMood={robotMood}
          wakeKey={activity}
          hold={sending || speakingId !== null}
          speaking={speakingId !== null || replyArriving}
          reaction={reaction}
          dismissed={robotDismissed}
          onDismiss={() => setRobotDismissed(true)}
        />}

        {/* chat area */}
        {/* takes the space left between the header and the composer, so a tall composer (the interview panel) never pushes the message box off screen */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto max-w-3xl px-6   py-6 space-y-6">
            {messages.map((chat) => (
              <MessageBubble
                key={chat.id}
                author={chat.author}
                at={chat.at}
                onPlayAudio={chat.author !== "user" ? () => handlePlayAudio(chat.id, chat.text) : undefined}
                isSpeaking={speakingId === chat.id}
              >
                {chat.author === "user" ? chat.text : stripStageDirections(chat.text)}
              </MessageBubble>
            ))}
          </div>
          <div ref={endRef}></div>
        </ScrollArea>

        {/* composer */}
        <div className="border-t p-3">
          {/* Mark was dragged away: say how to bring him back (a button, or the words "come robo") */}
          {robotDismissed && (
            <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-xs">
              <span>Mark has gone off. Say &ldquo;come robo&rdquo; or &ldquo;robo where are you&rdquo;, or start a new chat, to call him back.</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setRobotDismissed(false)}>Call Mark</Button>
            </div>
          )}

          {/* Who answers: "Chat" for a normal conversation, or "Select agent" to pick a specialist
              (for now just Troubleshoot, which can look up and open tickets). */}
          <div className="mx-auto mb-2 flex max-w-3xl items-center gap-3">
            <div className="relative inline-flex rounded-xl bg-muted p-1">
              <button
                type="button"
                aria-pressed={agent === "chat"}
                onClick={() => chooseAgent("chat")}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  agent === "chat" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Chat
              </button>

              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={agentMenuOpen}
                onClick={() => setAgentMenuOpen((open) => !open)}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  selectedAgent ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {selectedAgent ? <selectedAgent.Icon className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                {selectedAgent ? selectedAgent.label : "Select agent"}
                <ChevronUp className="h-3 w-3" />
              </button>

              {agentMenuOpen && (
                <>
                  {/* invisible full-screen layer: clicking anywhere outside closes the menu */}
                  <div className="fixed inset-0 z-10" onClick={() => setAgentMenuOpen(false)} />
                  <div role="menu" aria-label="Select agent" className="absolute bottom-full left-0 z-20 mb-2 w-72 rounded-xl border bg-background p-1 shadow-lg">
                    <p className="px-2 py-1 text-xs text-muted-foreground">Select an agent</p>
                    {AGENTS.map(({ id, label, hint, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={agent === id}
                        onClick={() => {
                          chooseAgent(id);
                          setAgentMenuOpen(false);
                        }}
                        className="flex w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted"
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="flex-1">
                          <span className="block text-sm font-medium">{label}</span>
                          <span className="block text-xs text-muted-foreground">{hint}</span>
                        </span>
                        {agent === id && <Check className="mt-0.5 h-4 w-4 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <span className="hidden text-xs text-muted-foreground sm:inline">
              {selectedAgent
                ? `${selectedAgent.label} agent: ${selectedAgent.hint.charAt(0).toLowerCase()}${selectedAgent.hint.slice(1)}.`
                : "Just chatting. Select an agent when you need help with something."}
            </span>
          </div>

          {/* The interview agent's panel: mock interview topics, resume and project buttons, and file upload. */}
          {agent === "interview" && (
            <InterviewPanel onSend={(text) => sendMessage(text)} busy={sending} />
          )}

          {voiceActive && (
            <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-xs">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                {isRecording && "Listening..."}
                {transcribing && "Transcribing..."}
                {speakingId !== null && "Speaking..."}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={cancelVoice}
                aria-label="Cancel voice and go back to text"
                title="Cancel voice and go back to text"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          {voiceError && (
            <div className="mx-auto mb-2 flex max-w-3xl items-start justify-between gap-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <span>{voiceError}</span>
              <button
                type="button"
                onClick={() => setVoiceError(null)}
                className="shrink-0 font-medium hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                wake();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={transcribing ? "Transcribing..." : selectedAgent ? selectedAgent.placeholder : "Write a message..."}
              disabled={transcribing}
              className={"flex-1 rounded-3xl"}
            />
            <Button
              type="button"
              variant={isRecording && voiceMode === "text" ? "destructive" : "outline"}
              size={"icon"}
              className={"rounded-full"}
              onClick={() => handleVoiceButtonClick("text")}
              disabled={transcribing || sending || (isRecording && voiceMode !== "text")}
              aria-label={
                isRecording && voiceMode === "text"
                  ? "Stop recording"
                  : "Speak - transcribes into a text reply"
              }
              title="Speak - transcribes into a text reply"
            >
              {isRecording && voiceMode === "text" ? (
                <Square className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant={isRecording && voiceMode === "voice" ? "destructive" : "outline"}
              size={"icon"}
              className={"rounded-full"}
              onClick={() => handleVoiceButtonClick("voice")}
              disabled={transcribing || sending || (isRecording && voiceMode !== "voice")}
              aria-label={
                isRecording && voiceMode === "voice"
                  ? "Stop recording"
                  : "Talk - full voice conversation, reply spoken back"
              }
              title="Talk - full voice conversation, reply spoken back"
            >
              {isRecording && voiceMode === "voice" ? (
                <Square className="h-4 w-4" />
              ) : (
                <Headphones className="h-4 w-4" />
              )}
            </Button>
            {transcribing && <Spinner />}
            <Button
              disabled={sending || transcribing || !draft.trim()}
              onClick={handleSend}
              className={"rounded-2xl px-5"}
            >
              {sending ? <Spinner /> : <Send className="h-4 w-4" />}
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Chat;
