import { supabase } from './supabase.js';

const BASIS = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function daftarkanPush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    const reg = await navigator.serviceWorker.register('/sw.js');
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return false; // VAPID public key dikonfigurasi saat Rilis 1 penuh
    const { data } = await supabase.auth.getSession();
    await fetch(`${BASIS}/api/push/subscribe`, {
      method: 'POST', headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data?.session?.access_token || ''}`,
      },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    return true;
  } catch { return false; }
}
