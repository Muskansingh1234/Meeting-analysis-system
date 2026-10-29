import StatusBadge from "./StatusBadge";
export default function MeetingList({ meetings = [], onSelect = () => {} }) {
  if (!meetings.length) return <div className="empty-list"><strong>No meetings found</strong><p>Create a meeting or try a different search.</p></div>;
  return <div className="meeting-list">{meetings.map((meeting) => <article className="meeting-row" key={meeting.id}><div className="meeting-file-icon">▤</div><button className="meeting-title-button" onClick={() => onSelect(meeting)}><strong>{meeting.title}</strong><span>{meeting.date} · {meeting.duration}</span></button><StatusBadge status={meeting.status} /><button className="more-button" onClick={() => onSelect(meeting)} aria-label={`View ${meeting.title}`}>→</button></article>)}</div>;
}
