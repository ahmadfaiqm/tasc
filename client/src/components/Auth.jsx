import { useEffect, useState } from 'react';
import { supabase, supabaseAktif } from '../lib/supabase.js';

export default function Auth({ onUser }) {
  const [email, setEmail] = useState('');
  const [pesan, setPesan] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!supabaseAktif()) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      onUser?.(data.session?.user || null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sesi) => {
      setUser(sesi?.user || null);
      onUser?.(sesi?.user || null);
    });
    return () => sub.subscription.unsubscribe();
  }, [onUser]);

  if (!supabaseAktif()) return <p className="mute">Mode tamu — tugas tersimpan di browser ini.</p>;
  if (user) return (
    <p>Hai, {user.email} <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>Keluar</button></p>
  );
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      setPesan('Mengirim tautan masuk…');
      const { error } = await supabase.auth.signInWithOtp({ email });
      setPesan(error ? `Gagal: ${error.message}` : 'Cek email untuk tautan masuk.');
    }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="text" aria-label="Email" placeholder="email@contoh.id" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn" type="submit">Masuk</button>
      </div>
      {pesan && <p className="mute">{pesan}</p>}
    </form>
  );
}
