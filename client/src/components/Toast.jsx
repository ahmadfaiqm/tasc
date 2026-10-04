export default function Toast({ toast, onUrung }) {
  if (!toast) return null;
  return (
    <div className="toast" role="status">
      {toast.pesan}{' '}
      {toast.aksi && <button className="btn" style={{ padding: '6px 12px', marginLeft: 8 }} onClick={onUrung}>{toast.aksi.label}</button>}
    </div>
  );
}
