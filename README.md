# MediTracker

A modern, responsive web application built with Next.js, React, and Prisma, designed to track and manage medication schedules.

## Features
- **Medication Scheduling**: Schedule medications with custom intervals, specific days of the week, and date ranges.
- **Smart Dashboard**: Context-aware dashboard that alerts you when medications are due (within < 24h).
- **Audio & Visual Alerts**: Emits audio sounds and browser notifications when the tracker is open and a medication is due.
- **Custom Logs**: Log administrations for the exact time they occurred natively.
- **Read-Only Mode**: Unauthenticated users can view the dashboard (and get notifications) in read-only mode.

## Authentication & User Management
The application uses a lightweight, secure cookie-based Next.js route handler system for authentication.

- **Creating Users**: Simply click on "Login", then "Register here" to create an account. No email required, just a username and password.
- **Admin Accounts**: The *very first user* registered in the system is automatically assigned the `ADMIN` role. 
  - Admins have the ability to explicitly log medication administration *on behalf of other users* by specifying their User ID in the "Log Custom Administration" form.

## Getting Started

### Prerequisites
- Node.js (v18.17+)
- npm 

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Initialize the database (SQLite):
   ```bash
   npx prisma db push
   npx prisma generate
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) (or 3001 if port is busy) in your browser.

## Database Management
This app uses a local SQLite database (`dev.db`). 
To apply future schema changes:
```bash
npx prisma db push
```

To view and edit the database graphically:
```bash
npx prisma studio
```
