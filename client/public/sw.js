self.addEventListener('push', (event) => {
  const data = (() => { try { return event.data.json(); } catch { return { title: 'TASKA', body: 'Tenggat dekat.' }; } })();
  event.waitUntil(self.registration.showNotification(data.title || 'TASKA', { body: data.body || '' }));
});
