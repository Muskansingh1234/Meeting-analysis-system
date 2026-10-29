export default function Sidebar({ active = "Dashboard", onNavigate = () => {} }) {
  const items = [["Dashboard", "▦"], ["Meetings", "▤"], ["Transcripts", "≡"], ["Tasks", "✓"]];
  return <nav className="navigation">{items.map(([name, icon]) => <button key={name} className={`nav-item ${active === name ? "active" : ""}`} onClick={() => onNavigate(name)}><span className="nav-icon">{icon}</span>{name}</button>)}</nav>;
}
