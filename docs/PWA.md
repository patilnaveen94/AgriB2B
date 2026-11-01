# Shri Balaji Fertilizer mobile app

Shri Balaji Fertilizer is installable as a Progressive Web App (PWA) on phones
and desktops.
The installed app uses the same customer and admin accounts, routes, and
features as the website.
Signing in is remembered on the installed app's origin. If you open the PWA
while already signed in, it returns to your role-specific dashboard instead of
asking you to sign in again.

## Install

- **Android:** Open the app in a supported browser such as Chrome, then choose
  **Install Shri Balaji Fertilizer** from the account menu (or browser prompt).
- **iPhone/iPad:** Open the app in Safari, choose **Share**, then **Add to Home
  Screen**. The account menu also shows these steps.

Production hosting must use HTTPS. The web manifest and service worker are at
the site root so that all customer and admin routes are in scope.

## Offline behavior

The service worker keeps the app shell and static, same-origin build assets
available for loading without a network connection. It does not cache Firebase
requests, account data, or other API responses. Signing in, viewing current
server data, and submitting orders still require a network connection.

Order notifications are shown in the app and can also use browser notifications
after permission is granted. In demo mode, orders and notifications are stored
in that browser's local storage and are not shared across devices. Cross-device
delivery requires connecting a shared backend and push-notification service.

The service worker is registered only in production builds. After deploying a
new version, a page reload fetches the latest app shell and assets.
