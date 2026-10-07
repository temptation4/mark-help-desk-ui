import React, { useCallback, useEffect, useRef, useState } from "react";
import { Briefcase, Check, ExternalLink, ListChecks, Search, UserRound } from "lucide-react";
import { Button, buttonVariants } from "./ui/button";
import { approveApplication, getApplications, getJobsStatus, markApplied } from "../services/jobs.service";

// The buttons only type a message for you: the interview agent does the work with the job agent's tools.
const ACTIONS = [
  { label: "Find jobs for me", message: "Find jobs that match my profile. If you do not have my profile yet, ask me for it.", Icon: Search },
  { label: "My profile", message: "Show my job profile.", Icon: UserRound },
  { label: "My shortlist", message: "Show my shortlisted jobs.", Icon: ListChecks },
  { label: "Naukri link", message: "Give me a Naukri search link for my role and city.", Icon: ExternalLink },
];

const STATUS_LABEL = { DRAFT: "Draft: needs your approval", APPROVED: "Approved: apply on the job site", APPLIED: "Applied" };
const STATUS_STYLE = {
  DRAFT: "bg-amber-100 text-amber-900",
  APPROVED: "bg-sky-100 text-sky-900",
  APPLIED: "bg-emerald-100 text-emerald-900",
};

/**
 * The Jobs part of the interview panel: which job sources are connected, buttons that ask the agent to search and match, and the user's
 * applications. An application starts as a draft that the agent prepared. Only YOU can approve it (the button here), and only you can
 * submit it: after approving, "Open apply page" takes you to the job's own site, and "I applied" records that you did it.
 */
function JobsPanel({ onSend, busy }) {
  const [status, setStatus] = useState(null); // null while checking
  const [applications, setApplications] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(""); // the application being approved or marked

  const loadStatus = useCallback(() => {
    getJobsStatus().then(setStatus).catch((e) => setStatus({ enabled: true, available: false, sources: [], error: e.message }));
  }, []);

  const loadApplications = useCallback(() => {
    getApplications().then((list) => { setApplications(list); setError(""); }).catch((e) => setError(e.message));
  }, []);

  useEffect(loadStatus, [loadStatus]);

  // the list is read as soon as the job agent is known to be there (for the count on the button), when it is opened, and again each time
  // the agent finishes an answer (it may have prepared a draft)
  const wasBusy = useRef(busy);
  const loaded = useRef(false);
  useEffect(() => {
    const finished = wasBusy.current && !busy;
    wasBusy.current = busy;
    if (!status?.available) return;
    if (open || finished || !loaded.current) {
      loaded.current = true;
      loadApplications();
    }
  }, [open, busy, status?.available, loadApplications]);

  async function decide(id, action) {
    setWorking(id);
    try {
      await action(id);
      setError("");
      loadApplications();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking("");
    }
  }

  const drafts = applications.filter((a) => a.status === "DRAFT").length;

  return (
    <div className="space-y-2 border-t pt-2" aria-label="Jobs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 font-medium"><Briefcase className="h-4 w-4" /> Jobs</span>

        {status === null && <span className="text-xs text-muted-foreground">Checking the job agent...</span>}
        {status && !status.enabled && (
          <span className="text-xs text-muted-foreground">
            Job search is off. Start the job agent and the help desk with JOB_AGENT_ENABLED=true (see the README).
          </span>
        )}
        {status?.enabled && !status.available && (
          <>
            <span className="text-xs text-muted-foreground">The job agent is not running. Start it and its authorization server, then try again.</span>
            <Button type="button" variant="outline" size="sm" onClick={loadStatus}>Retry</Button>
          </>
        )}

        {status?.available && (
          <>
            {ACTIONS.map(({ label, message, Icon }) => (
              <Button key={label} type="button" variant="outline" size="sm" disabled={busy} onClick={() => onSend(message)}>
                <Icon /> {label}
              </Button>
            ))}
            <Button type="button" variant={open ? "secondary" : "outline"} size="sm" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
              Applications{applications.length > 0 && ` (${applications.length})`}{drafts > 0 && ` · ${drafts} to approve`}
            </Button>
          </>
        )}
      </div>

      {status?.available && status.sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>Job sources:</span>
          {status.sources.map((source) => (
            <span key={source.id} title={source.howToConnect || "Connected"} className="flex items-center gap-1">
              <span className={`inline-block h-2 w-2 rounded-full ${source.connected ? "bg-emerald-500" : "bg-slate-300"}`} aria-hidden="true" />
              {source.label}{source.connected ? "" : " (not connected)"}
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}

      {open && status?.available && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Mark never sends anything. You approve a draft here, then open the job's own page and submit it yourself.
          </p>
          {applications.length === 0 && <p className="text-xs text-muted-foreground">No applications yet. Ask Mark to prepare one for a job.</p>}
          {applications.map((app) => (
            <div key={app.id} className="space-y-1 rounded-lg border bg-background p-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{app.jobTitle}</span>
                <span className="text-muted-foreground">at {app.company}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[app.status]}`}>{STATUS_LABEL[app.status] ?? app.status}</span>
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">Read the cover note</summary>
                <pre className="mt-1 whitespace-pre-wrap font-sans">{app.coverNote}</pre>
              </details>
              <div className="flex flex-wrap items-center gap-2">
                {app.status === "DRAFT" && (
                  <Button type="button" size="sm" disabled={working === app.id} onClick={() => decide(app.id, approveApplication)}>
                    <Check /> Approve
                  </Button>
                )}
                {app.status === "APPROVED" && (
                  <>
                    <a href={app.applyUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm" })}>
                      <ExternalLink /> Open apply page
                    </a>
                    <Button type="button" variant="outline" size="sm" disabled={working === app.id} onClick={() => decide(app.id, markApplied)}>
                      I applied
                    </Button>
                  </>
                )}
                {app.status === "APPLIED" && <span className="text-xs text-emerald-700">Applied ✓</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default JobsPanel;
