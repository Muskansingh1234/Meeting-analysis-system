import MeetingList from "../components/MeetingList";
export default function Meetings({ meetings = [], onSelect = () => {} }) {
  return <section className="panel meetings-panel"><div className="section-heading"><div><h2>All meetings</h2><p>{meetings.length} meeting records</p></div></div><MeetingList meetings={meetings} onSelect={onSelect}/></section>;
}
