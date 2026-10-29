
import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import MeetingRecorder from "./components/MeetingRecorder";

const API_URL = "http://127.0.0.1:8000";

function formatMeetingDate(date) {
  if (!date) return "Date not set";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function mapMeetingFromApi(meeting) {
  const statusMap = {
    scheduled: "Scheduled",
    transcribed: "Completed",
    processing: "Processing",
    uploaded: "Uploaded",
  };

  return {
    id: meeting.id,
    title: meeting.title,
    date: formatMeetingDate(meeting.meeting_date),
    duration: "Not available",
    status: statusMap[meeting.status] || meeting.status || "Scheduled",
    type: "General",
    transcript: meeting.transcript || "",
    summary: meeting.summary || "",
    description: meeting.description || "",
    fileName: "",
  };
}

export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [apiError, setApiError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [savingMeeting, setSavingMeeting] = useState(false);

  const loadMeetings = useCallback(async () => {
    setLoadingMeetings(true);
    setApiError("");

    try {
      const response = await fetch(`${API_URL}/meetings`);

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Unexpected response from the backend.");
      }

      const mapped = data.map(mapMeetingFromApi);
      setMeetings(mapped);

      setSelectedMeeting((current) => {
        if (!current) return null;
        return mapped.find((item) => item.id === current.id) || null;
      });
    } catch (error) {
      setApiError(
        `Could not load meetings. Make sure FastAPI is running at ${API_URL}. ${error.message}`
      );
    } finally {
      setLoadingMeetings(false);
    }
  }, []);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const completed = meetings.filter(
    (meeting) => meeting.status === "Completed"
  ).length;

  const filteredMeetings = useMemo(
    () =>
      meetings.filter((meeting) =>
        meeting.title.toLowerCase().includes(search.toLowerCase())
      ),
    [meetings, search]
  );

  function openPage(name) {
    setPage(name);
    setNotice("");
    setSelectedMeeting(null);
    setSearch("");
    setShowCreate(false);
  }

  async function createMeeting(event) {
    event.preventDefault();

    if (!title.trim()) return;

    setSavingMeeting(true);
    setNotice("");

    try {
      const payload = {
        title: title.trim(),
        ...(meetingDate
          ? { meeting_date: new Date(meetingDate).toISOString() }
          : {}),
      };

      const response = await fetch(`${API_URL}/meetings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : `Server returned HTTP ${response.status}`
        );
      }

      const savedMeeting = mapMeetingFromApi(result);

      setMeetings((current) => [
        savedMeeting,
        ...current.filter((meeting) => meeting.id !== savedMeeting.id),
      ]);

      setTitle("");
      setMeetingDate("");
      setShowCreate(false);
      setPage("Meetings");
      setNotice("Meeting saved successfully to your SQLite database.");
    } catch (error) {
      setNotice(`Could not save meeting: ${error.message}`);
    } finally {
      setSavingMeeting(false);
    }
  }

  function handleMeetingSaved(savedMeeting) {
    if (!savedMeeting || savedMeeting.id == null) {
      loadMeetings();
      return;
    }

    const meeting = mapMeetingFromApi(savedMeeting);

    setMeetings((current) => [
      meeting,
      ...current.filter((item) => item.id !== meeting.id),
    ]);

    setSelectedMeeting(null);
    setNotice("Meeting and transcript saved successfully.");
  }

  const transcriptMeetings = meetings.filter(
    (meeting) => meeting.transcript.trim().length > 0
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          href="#dashboard"
          className="brand"
          onClick={(event) => {
            event.preventDefault();
            openPage("Dashboard");
          }}
        >
          <div className="brand-mark">M</div>
          <div>
            <strong>MeetMind</strong>
            <span>MEETING INTELLIGENCE</span>
          </div>
        </a>

        <div className="nav-label">WORKSPACE</div>

        <nav className="navigation">
          {[
            { name: "Dashboard", icon: "▦" },
            { name: "Meetings", icon: "▤" },
            { name: "Transcripts", icon: "≡" },
            { name: "Tasks", icon: "✓" },
          ].map((item) => (
            <button
              key={item.name}
              className={`nav-item ${
                page === item.name ? "active" : ""
              }`}
              onClick={() => openPage(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>
              {item.name === "Tasks" && (
                <span className="nav-count">3</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="cloud-card">
            <div className="cloud-icon">☁</div>
            <strong>Cloud workspace</strong>
            <p>Your meetings and insights in one place.</p>
            <div className="progress-track">
              <span />
            </div>
            <small>Local database connected through API</small>
          </div>

          <div className="user-profile">
            <div className="avatar">U</div>
            <div>
              <strong>Project User</strong>
              <span>Workspace member</span>
            </div>
            <span className="profile-menu">···</span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">
            Workspace <span>/</span> <strong>{page}</strong>
          </div>

          <div className="topbar-actions">
            <span className="demo-pill">
              <span className="online-dot" /> API connected
            </span>
            <div className="avatar small-avatar">U</div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">YOUR MEETING WORKSPACE</p>
              <h1>{page === "Dashboard" ? "Good to see you!" : page}</h1>
              <p className="welcome-description">
                {page === "Dashboard"
                  ? "Manage meetings, capture insights, and keep every action on track."
                  : page === "Meetings"
                    ? "Create, search, and organize your meeting records."
                    : page === "Transcripts"
                      ? "Review transcripts generated from your meeting recordings."
                      : "Keep track of decisions, action items, and deadlines."}
              </p>
            </div>

            <button
              className="button primary-button"
              onClick={() => {
                setShowCreate(true);
                setSelectedMeeting(null);
                setNotice("");
              }}
            >
              <span className="plus-icon">＋</span> New meeting
            </button>
          </section>

          {apiError && (
            <div className="notice" role="alert">
              <span>{apiError}</span>
              <button
                onClick={() => setApiError("")}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button
                onClick={() => setNotice("")}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          {showCreate && (
            <section className="panel create-panel">
              <div className="section-heading">
                <div>
                  <h2>Create a new meeting</h2>
                  <p>Save meeting details to your database.</p>
                </div>

                <button
                  className="icon-button"
                  onClick={() => setShowCreate(false)}
                  aria-label="Close form"
                >
                  ×
                </button>
              </div>

              <form onSubmit={createMeeting} className="meeting-form">
                <label htmlFor="meeting-title">Meeting title *</label>
                <input
                  id="meeting-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Weekly project meeting"
                  required
                  maxLength={200}
                />

                <label htmlFor="meeting-date">
                  Meeting date and time
                </label>
                <input
                  id="meeting-date"
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(event) => setMeetingDate(event.target.value)}
                />

                <p className="form-hint">
                  To record live audio, use the Meeting Recorder on the
                  Dashboard.
                </p>

                <div className="form-actions">
                  <button
                    type="button"
                    className="button secondary-button"
                    onClick={() => {
                      setShowCreate(false);
                      setTitle("");
                      setMeetingDate("");
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="button primary-button"
                    disabled={savingMeeting}
                  >
                    {savingMeeting ? "Saving..." : "Create meeting"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {selectedMeeting && (
            <section className="panel detail-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">MEETING DETAILS</p>
                  <h2>{selectedMeeting.title}</h2>
                </div>

                <button
                  className="button secondary-button"
                  onClick={() => setSelectedMeeting(null)}
                >
                  Back to list
                </button>
              </div>

              <div className="detail-grid">
                <div>
                  <span>Date</span>
                  <strong>{selectedMeeting.date}</strong>
                </div>
                <div>
                  <span>Duration</span>
                  <strong>{selectedMeeting.duration}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <StatusBadge status={selectedMeeting.status} />
                </div>
              </div>

              {selectedMeeting.description && (
                <div className="coming-soon">
                  <div>
                    <strong>Description</strong>
                    <p>{selectedMeeting.description}</p>
                  </div>
                </div>
              )}

              {selectedMeeting.transcript ? (
                <div className="coming-soon">
                  <span>≡</span>
                  <div>
                    <strong>Meeting transcript</strong>
                    <p style={{ whiteSpace: "pre-wrap" }}>
                      {selectedMeeting.transcript}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="coming-soon">
                  <span>✧</span>
                  <div>
                    <strong>Meeting transcript</strong>
                    <p>
                      No transcript is available for this meeting yet.
                    </p>
                  </div>
                </div>
              )}

              {selectedMeeting.summary && (
                <div className="coming-soon">
                  <span>✧</span>
                  <div>
                    <strong>Meeting summary</strong>
                    <p style={{ whiteSpace: "pre-wrap" }}>
                      {selectedMeeting.summary}
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {!selectedMeeting && page === "Dashboard" && (
            <>
              <section className="stats-grid">
                <StatCard
                  icon="▤"
                  tone="purple"
                  label="Total meetings"
                  value={meetings.length}
                  detail="Saved meetings"
                />
                <StatCard
                  icon="✧"
                  tone="green"
                  label="Completed analyses"
                  value={completed}
                  detail="Transcribed meetings"
                />
                <StatCard
                  icon="✓"
                  tone="orange"
                  label="Pending tasks"
                  value="3"
                  detail="Sample data"
                />
              </section>

              <MeetingRecorder onMeetingSaved={handleMeetingSaved} />

              <section className="upload-banner">
                <div className="upload-symbol">↑</div>
                <div className="upload-text">
                  <h2>Turn conversations into insights</h2>
                  <p>
                    Record a meeting to create a transcript and prepare
                    for AI-powered analysis.
                  </p>
                </div>
                <button
                  className="button banner-button"
                  onClick={() => {
                    setShowCreate(true);
                    setNotice("");
                  }}
                >
                  New meeting <span>→</span>
                </button>
              </section>
            </>
          )}

          {!selectedMeeting &&
            (page === "Dashboard" || page === "Meetings") && (
              <section className="panel meetings-panel">
                <div className="section-heading meetings-heading">
                  <div>
                    <h2>
                      {page === "Dashboard"
                        ? "Recent meetings"
                        : "All meetings"}
                    </h2>
                    <p>
                      {loadingMeetings
                        ? "Loading meetings..."
                        : `${meetings.length} saved meeting${
                            meetings.length === 1 ? "" : "s"
                          }`}
                    </p>
                  </div>

                  <div className="meeting-tools">
                    <label className="search-box">
                      <span>⌕</span>
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search meetings..."
                        aria-label="Search meetings"
                      />
                    </label>

                    <button
                      className="text-button"
                      onClick={loadMeetings}
                      disabled={loadingMeetings}
                    >
                      Refresh ↻
                    </button>

                    {page === "Dashboard" && (
                      <button
                        className="text-button"
                        onClick={() => openPage("Meetings")}
                      >
                        View all →
                      </button>
                    )}
                  </div>
                </div>

                {loadingMeetings ? (
                  <p>Loading meetings from SQLite...</p>
                ) : (
                  <MeetingTable
                    meetings={
                      page === "Dashboard"
                        ? filteredMeetings.slice(0, 4)
                        : filteredMeetings
                    }
                    onSelect={setSelectedMeeting}
                  />
                )}
              </section>
            )}

          {!selectedMeeting && page === "Transcripts" && (
            <section className="panel meetings-panel">
              <div className="section-heading">
                <div>
                  <h2>Meeting transcripts</h2>
                  <p>Transcripts saved with your meetings.</p>
                </div>
                <button
                  className="button secondary-button"
                  onClick={loadMeetings}
                  disabled={loadingMeetings}
                >
                  Refresh
                </button>
              </div>

              {loadingMeetings ? (
                <p>Loading transcripts...</p>
              ) : transcriptMeetings.length === 0 ? (
                <div className="empty-panel">
                  <div className="empty-icon">≡</div>
                  <h2>No transcripts yet</h2>
                  <p>
                    Record a meeting and finish transcription to see
                    the transcript here.
                  </p>
                  <button
                    className="button primary-button"
                    onClick={() => openPage("Dashboard")}
                  >
                    Go to Meeting Recorder
                  </button>
                </div>
              ) : (
                <div className="transcript-list">
                  {transcriptMeetings.map((meeting) => (
                    <article className="panel" key={meeting.id}>
                      <div className="section-heading">
                        <div>
                          <h3>{meeting.title}</h3>
                          <p>{meeting.date}</p>
                        </div>
                        <button
                          className="button secondary-button"
                          onClick={() => setSelectedMeeting(meeting)}
                        >
                          View transcript
                        </button>
                      </div>
                      <p>
                        {meeting.transcript.length > 180
                          ? `${meeting.transcript.slice(0, 180)}...`
                          : meeting.transcript}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {!selectedMeeting && page === "Tasks" && (
            <section className="panel tasks-panel">
              <div className="section-heading">
                <div>
                  <h2>Action items</h2>
                  <p>
                    Example tasks for your future task manager.
                  </p>
                </div>
                <span className="demo-pill">Sample data</span>
              </div>

              {[
                [
                  "Prepare the project presentation",
                  "High priority",
                  "In progress",
                ],
                ["Review meeting notes", "Medium priority", "Pending"],
                [
                  "Share research documents",
                  "Low priority",
                  "Pending",
                ],
              ].map(([task, priority, status]) => (
                <div className="task-row" key={task}>
                  <div className="task-check">✓</div>
                  <div className="task-description">
                    <strong>{task}</strong>
                    <span>{priority}</span>
                  </div>
                  <span className="task-status">{status}</span>
                </div>
              ))}

              <p className="form-hint">
                These are example tasks and are not yet extracted from
                meeting transcripts.
              </p>
            </section>
          )}

          <footer className="footer">
            <span>MeetMind · Intelligent Meeting Analysis</span>
            <span>Final-year project</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, tone, label, value, detail }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <p>{label}</p>
      <div className="stat-value-row">
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </article>
  );
}

function StatusBadge({ status }) {
  const classes = {
    Completed: "completed",
    Processing: "processing",
    Uploaded: "uploaded",
    Scheduled: "scheduled",
  };

  return (
    <span className={`status-badge ${classes[status] || "scheduled"}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}

function MeetingTable({ meetings, onSelect }) {
  if (!meetings.length) {
    return (
      <div className="empty-list">
        <div className="empty-icon">⌕</div>
        <strong>No meetings found</strong>
        <p>Create a meeting or try a different search.</p>
      </div>
    );
  }

  return (
    <div className="meeting-list">
      {meetings.map((meeting) => (
        <article className="meeting-row" key={meeting.id}>
          <div className="meeting-file-icon">▤</div>

          <button
            className="meeting-title-button"
            onClick={() => onSelect(meeting)}
          >
            <strong>{meeting.title}</strong>
            <span>
              {meeting.date} · {meeting.duration}
            </span>
          </button>

          <StatusBadge status={meeting.status} />

          <button
            className="more-button"
            onClick={() => onSelect(meeting)}
            aria-label={`View ${meeting.title}`}
            title="View meeting details"
          >
            →
          </button>
        </article>
      ))}
    </div>
  );
}
