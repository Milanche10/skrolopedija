// Premium „shimmer" placeholder u obliku kartice dok se feed učitava.
export default function FeedSkeleton({ note }) {
  return (
    <div className="card-skeleton">
      <div className="spine sk-spine" />
      <div className="sk sk-pill" />
      <div className="sk sk-title" />
      <div className="sk sk-title short" />
      <div style={{ height: 10 }} />
      <div className="sk sk-line" />
      <div className="sk sk-line s2" />
      <div className="sk sk-line s3" />
      {note && <div className="sk-note">{note}</div>}
    </div>
  );
}
