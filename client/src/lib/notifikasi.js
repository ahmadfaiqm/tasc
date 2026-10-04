export async function mintaIzinNotifikasi() {
  if (!('Notification' in window)) return 'tak-didukung';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

export function kirimPengingat(task) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification('TASKA — tenggat dekat', { body: `"${task.nama}" kurang dari 5 menit.` });
}
