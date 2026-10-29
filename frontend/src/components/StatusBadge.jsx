export default function StatusBadge({ status = "Scheduled" }) {
  const classes = { Completed: "completed", Processing: "processing", Uploaded: "uploaded", Scheduled: "scheduled" };
  return <span className={`status-badge ${classes[status] || "scheduled"}`}><span className="status-dot" />{status}</span>;
}
