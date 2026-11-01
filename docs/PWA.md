# Shri Balaji Fertilizer mobile app

Shri Balaji Fertilizer is installable as a Progressive Web App (PWA) on phones
and desktops.
The installed app uses the same customer and admin accounts, routes, and
features as the website.

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

The service worker is registered only in production builds. After deploying a
new version, a page reload fetches the latest app shell and assets.
