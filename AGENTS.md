<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Testing & Development Practices

- **Testing Infrastructure**: A **Vitest** testing framework is configured in `vitest.config.ts`. It includes a Prisma singleton mock for isolated logic testing.
- **New Logic**: Always unit test new logic and anything relevant to its interactions with existing systems.
- **Verification**: You should verify functionality through the browser subagent, unit tests, or both before committing.
- **Commits**: Group logic changes into a single, cohesive commit. NEVER commit unverified code.

# Push Notifications (Capacitor/Android)

- **Current Implementation (Client-Side Scheduled)**: Currently, the app uses `@capacitor/local-notifications` to schedule push notifications for the next 48 hours of upcoming medications when the app is opened or the dashboard is refreshed. This is handled in `GlobalNotifications.tsx`. This avoids the need for server-side infrastructure but has the limitation that if the medication schedule changes on the server (e.g. from a different device), the local device will not know about the change until the app is opened again.
- **Future Migration (Server-Side FCM)**: To support true, real-time push notifications that wake up the app even if the device hasn't opened it recently, the project will need to migrate to Firebase Cloud Messaging (FCM).
  - This requires setting up a Firebase project and adding `google-services.json`.
  - Adding the `@capacitor/push-notifications` plugin.
  - Adding a `DeviceToken` table to the database to link user accounts to FCM tokens.
  - Creating a backend continuous worker or Cron job (outside of Next.js serverless functions, or using a robust external Cron provider) to query the database every minute for upcoming medications and use the `firebase-admin` SDK to push notifications to the respective devices.
