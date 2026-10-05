export default function Toast({ pesan, aksiLabel, onAksi }) {
  if (!pesan) return null;
  return (
    <div className="toast" role="status">
      <span>{pesan}</span>
      {aksiLabel && (
        <button type="button" onClick={onAksi}>
          {aksiLabel}
        </button>
      )}
    </div>
  );
}
