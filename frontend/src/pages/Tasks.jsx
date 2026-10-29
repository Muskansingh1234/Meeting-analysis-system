export default function Tasks() {
  const items = ["Prepare the project presentation", "Review meeting notes", "Share research documents"];
  return <section className="panel tasks-panel"><div className="section-heading"><div><h2>Action items</h2><p>Example tasks for the future task manager.</p></div></div>{items.map((task) => <div className="task-row" key={task}><div className="task-check">✓</div><div className="task-description"><strong>{task}</strong><span>Sample task</span></div><span className="task-status">Pending</span></div>)}</section>;
}
