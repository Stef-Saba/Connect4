import { precacheAndRoute } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
  let data = {
    title: 'Connect Four 🎮',
    body: "It's your turn in Connect Four 🎮",
    url: '/'
  }

  if (event.data) {
    try {
      data = event.data.json()
    } catch (error) {
      console.error('Could not read push notification:', error)
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: {
        url: data.url || '/'
      }
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          return
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})