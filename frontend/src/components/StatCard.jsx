export default function StatCard({ icon = "▤", tone = "purple", label, value, detail }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><p>{label}</p><div className="stat-value-row"><strong>{value}</strong><span>{detail}</span></div></article>;
}
