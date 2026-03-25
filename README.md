# MediTracker

A modern, highly-responsive web application built with **Next.js 16 (App Router)**, **React**, and **Prisma ORM**, explicitly designed to track and manage complex medication schedules securely over the network.

## Core Features
- **Advanced Scheduling Engine**: Schedule medications with custom hour intervals, specific days of the week, and date ranges. 
- **Administration Windows (Margins)**: Medications can only be administered within a strictly customizable minute-based window (e.g., ±30 minutes) of their due time.
- **Smart 24-Hour Projection Dashboard**: Context-aware dashboard that recursively projects all recurring doses forward 24 hours to give a comprehensive daily view.
- **Push & Web Audio Alerts**: Built-in 5-minute recurring background alert system utilizing the native Browser Web Audio API paired with Fallback In-App UI Toasts to bypass aggressive OS silenecers. Snoozable.
- **Custom Native Logs**: Advanced interface enabling users to log an administration for the *exact time* it happened in the past (to correct misses).
- **Log Management & Analytics**: Live search, filtering (by User ID, exact Date, Medication Name), and full edit/delete privileges for all timeline administration logs.
- **Hamburger UI & Dark Mode**: Responsive mobile-first navigation wrapped in a sleek glassmorphic design system.

## Authentication & Roles
The application uses a lightweight, secure cookie-based Next.js route handler encryption system.

- **Creating Users**: Simply click on "Login" -> "Register here". No email required.
- **Role-Based Access**:
  - **ADMIN**: The *very first user* registered in the system is automatically assigned the `ADMIN` role. Admins exclusively possess the global capability to Add/Edit/Delete Medications, override/backlog timestamps on behalf of other users via an interactive Dropdown list, and securely manage all logs.
  - **USER**: Can securely interact with their own logs and administer active medications.
  - **GUEST**: Unauthenticated devices entering the network can view a read-only projection of the dashboard but cannot tamper with the db logs.

## Getting Started

### Prerequisites
- Node.js (v18.17+)
- npm 

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Database:
   Create a `.env` file at the root and provide your **Neon PostgreSQL** credentials.
   ```bash
   DATABASE_URL="postgresql://user:password@remote-neon-db.../neondb?sslmode=require"
   ```

3. Initialize the database schema:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Access locally on your network!
   By default, the server is securely bound to local networks (`0.0.0.0`). Navigate to `http://localhost:3000` or `http://<your-local-ip-address>:3000` from any smartphone or secondary device connected to your WiFi.

## Database Management
This app requires a **PostgreSQL** database provider.
To apply future schema changes to your remote instance:
```bash
npx prisma db push
```

To view and edit the database graphically natively through Prisma:
```bash
npx prisma studio
```
