// Service Workerがプッシュ通知を受け取ったときの処理
self.addEventListener('push', function(event) {
  const data = event.data.json();
  const title = data.title || 'SVWB戦績記録';
  const options = {
    body: data.body,
    icon: './icon-192x192.png',
    tag: 'svwbrecord-shortcut' // 通知を置き換えるためのタグ
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 通知がクリックされたときの処理
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(self.location.origin)
  );
});