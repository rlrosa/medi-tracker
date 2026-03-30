# MediTracker

A modern, highly-responsive web application built with **Next.js 16 (App Router)**, **React**, and **Prisma ORM**, explicitly designed to track and manage complex medication schedules securely over the network.

## Core Features
- **Multi-Tenant Architecture**: Securely manage multiple households/families within a single database. Each account is isolated.
- **Account & Patient Hierarchy**: Supports multiple patients per account (e.g., children, elderly parents) with shared caregiver access.
- **Advanced Scheduling Engine**: Schedule medications with custom hour intervals, specific days of the week, and date ranges.
- **Administration Windows (Margins)**: Medications can only be administered within a strictly customizable minute-based window (e.g., ±30 minutes) of their due time.
- **Smart 24-Hour Projection Dashboard**: Context-aware dashboard that recursively projects all recurring doses forward 24 hours.
- **Push & Web Audio Alerts**: Built-in 5-minute recurring background alert system utilizing the native Browser Web Audio API.
- **Flexible Login**: Support for both **Email** and **Username** authentication to accommodate legacy users and modern preferences.
- **Caregiver Onboarding**: Manual "Link Generation" for invitations to bypass SMTP dependencies while maintaining security.

## Authentication & Roles
The application uses a secure JWT-based session system with encrypted cookies.

- **Account Registration**: New users create an `Account` and a primary `Patient` simultaneously.
- **Role-Based Access**:
  - **ADMIN**: Account owners can manage Patients, Medications, and Caregivers. They can see all emails and logs for their account.
  - **USER/CAREGIVER**: Can administer medications and view logs for all patients in the account.

## Getting Started

### Prerequisites
- Node.js (v18.17+)
- npm 

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Database & Environment Variables:
   Create a `.env` file at the root and provide your **Neon PostgreSQL** credentials along with your email configuration and Turnstile keys.
   ```bash
   DATABASE_URL="postgresql://user:password@remote-neon-db.../neondb?sslmode=require"

   # Cloudflare Turnstile for CAPTCHA
   NEXT_PUBLIC_TURNSTILE_SITE_KEY="your_site_key"
   TURNSTILE_SECRET_KEY="your_secret_key"

   # SMTP Configuration for Email Verification
   SMTP_HOST="smtp.yourprovider.com"
   SMTP_PORT="587"
   SMTP_SECURE="false"
   SMTP_USER="your_email@example.com"
   SMTP_PASS="your_password"
   SMTP_FROM="\"MediTracker\" <noreply@example.com>"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

3. Initialize the database schema and apply migrations:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
   *Note: If you are upgrading an existing database to the multi-tenant schema, run `npx ts-node scripts/migrate_to_multi_tenant.ts` to grant existing users access to their accounts.*

4. Setup Superadmin (First time only):
   After registering your first user, elevate them to Superadmin to be able to approve other users.
   ```bash
   npx ts-node scripts/make_superadmin.ts your_email@example.com
   ```

5. Run the development server:
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
