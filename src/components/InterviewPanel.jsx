import React, { useRef, useState } from "react";
import { FileSearch, FilePlus2, FolderGit2, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { uploadInterviewFile } from "../services/interview.service";

// The buttons only type a message for you: the interview agent does the work with the file tools of the MCP file server.
const TOPICS = ["Java", "Spring Boot", "Kafka", "System design", "Behavioural"];
const FILE_ACTIONS = [
  { label: "Check my resume", message: "Check my resume", Icon: FileSearch },
  { label: "Create my resume", message: "Create my resume from my projects", Icon: FilePlus2 },
  { label: "My projects", message: "What projects do I have?", Icon: FolderGit2 },
];

// What can be uploaded. A resume and a job description are text or PDF; "other" can also be code.
const UPLOADS = [
  { kind: "resume", label: "Resume", accept: ".pdf,.txt,.md,.markdown" },
  { kind: "job", label: "Job description", accept: ".pdf,.txt,.md,.markdown" },
  { kind: "other", label: "Other file", accept: ".pdf,.txt,.md,.java,.kt,.py,.js,.jsx,.ts,.tsx,.json,.yml,.yaml,.xml,.sql,.html,.css,.sh,.csv,.properties,.gradle" },
];
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // the backend refuses more than this too

/**
 * The interview agent's panel, shown above the message box: start a mock interview, ask about your resume and projects, and
 * upload a file. `onSend` sends a chat message; `busy` is true while a reply is arriving.
 */
function InterviewPanel({ onSend, busy }) {
  const [upload, setUpload] = useState({ state: "idle", text: "" }); // idle | uploading | done | error
  const pickers = useRef({}); // the hidden file inputs, one per kind

  // The file was chosen: save it, then let Mark look at it straight away (a resume is reviewed, a job description is compared
  // with the resume; another file can be asked about by name).
  async function handleUpload(kind, file) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setUpload({ state: "error", text: `${file.name} is too big. The limit is 2 MB.` });
      return;
    }
    setUpload({ state: "uploading", text: `Uploading ${file.name}...` });
    try {
      const saved = await uploadInterviewFile(file, kind);
      setUpload({ state: "done", text: `Uploaded ${saved.fileName}. Saved as ${saved.savedAs}.${saved.note ? " " + saved.note : ""}` });
      if (kind === "resume") onSend("Check my resume");
      if (kind === "job") onSend("Check my resume against the job description");
    } catch (error) {
      setUpload({ state: "error", text: error.message });
    }
  }

  return (
    <div className="mx-auto mb-2 max-w-3xl space-y-2 rounded-xl border bg-muted/40 p-3 text-sm" aria-label="Interview practice">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">Mock interview</span>
        {TOPICS.map((topic) => (
          <Button key={topic} type="button" variant="outline" size="sm" disabled={busy}
            onClick={() => onSend(`Start a mock interview on ${topic}. Ask me ONE question and wait for my answer.`)}>
            {topic}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Your files:</span>
        {FILE_ACTIONS.map(({ label, message, Icon }) => (
          <Button key={label} type="button" variant="outline" size="sm" disabled={busy} onClick={() => onSend(message)}>
            <Icon /> {label}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground">or type: write a Java REST API and save it</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Upload:</span>
        {UPLOADS.map(({ kind, label, accept }) => (
          <React.Fragment key={kind}>
            <input
              ref={(element) => { pickers.current[kind] = element; }}
              type="file"
              accept={accept}
              className="hidden"
              aria-label={`Choose a ${label.toLowerCase()} file`}
              onChange={(event) => {
                handleUpload(kind, event.target.files?.[0]);
                event.target.value = ""; // so the same file can be chosen again
              }}
            />
            <Button type="button" variant="outline" size="sm" disabled={busy || upload.state === "uploading"} onClick={() => pickers.current[kind]?.click()}>
              <Upload /> {label}
            </Button>
          </React.Fragment>
        ))}
        {upload.text && (
          <span className={`text-xs ${upload.state === "error" ? "text-destructive" : "text-muted-foreground"}`} role="status">
            {upload.text}
          </span>
        )}
      </div>
    </div>
  );
}

export default InterviewPanel;
