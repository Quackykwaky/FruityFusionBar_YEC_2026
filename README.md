# 🧋 Fruity Fusion Bar • Student Loyalty Program

A modern, fast, mobile-first student loyalty web application built for a high-energy campus drinks stall (fresh boba, real fruit smoothies, artisanal iced teas, and craft cold brews).

Students log in with their university Student ID (e.g. `8974743`), view their digital stamp card, and claim new stamps by entering a 30-second rolling verification code shown on the stall's counter terminal. Staff use a password-protected admin dashboard to display the rolling TOTP code and redeem earned free drinks.

---

## ✨ Features & Workflow

### 🥤 Student Login & Dashboard
- **Clean Student Login**: Enter your Student ID (e.g. `8974743`) to open your personal loyalty dashboard.
- **Deep-link QR Support**: Links pre-filled with student IDs (`/?id=8974743`) open directly into the dashboard.
- **Interactive Stamp Card**: Displays progress towards the next free drink (configurable: 3 or 5 stamps).
- **"+1 Stamp" with Staff Verification**: Clicking "+1 Stamp" opens a modal requesting the current 6-digit staff code from the counter.
- **Anti-Fraud & Replay Prevention**:
  - The server verifies the 6-digit code using a secure TOTP algorithm.
  - Codes rotate every 30 seconds. Expired codes are rejected.
  - Replay cache prevents using the same rolling code multiple times.
  - Rate limiting protects against brute force guessing.
- **Free Drink Reward Gate**:
  - Reaching the stamp threshold unlocks a celebratory **Free Drink Ready to Claim!** badge with confetti.
  - Further stamps are paused while a reward awaits redemption.
  - Staff redeem the reward at the counter, which starts a new cycle.

### 🛡️ Staff Terminal (`/admin`) & Discreet Access
- **Discreet Homepage Access**: A subtle "Staff access" option on the student login page reveals a password field without exposing administrative URLs to customers.
- **Direct Login Route**: Staff can also log in directly at `/admin/login`.
- **Shared Master Password**: One team password configured via server-side `ADMIN_PASSWORD`.
- **30-Second Rolling Code (TOTP)**:
  - Generates a large, high-visibility 6-digit verification code.
  - Displays a live countdown timer showing seconds remaining (e.g. `18s remaining`).
  - Automatically updates every 30 seconds with a "New Code Active" pulse indicator.
  - Server-side generation using cryptographically secure HMAC-SHA256 (`STAFF_TOTP_SECRET`). The underlying secret is never exposed to the browser.
- **Reward Redemption Terminal**:
  - Staff enter a customer's Student ID to verify eligibility.
  - One-click "Redeem Free Drink" button (with confirmation) deducts stamps, increments lifetime redemptions, and restarts the customer's cycle.
- **Audit Feed**: Real-time log of recent drink purchases and free drink redemptions.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack, React 19)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [Supabase](https://supabase.com/) PostgreSQL with Row-Level Security (RLS) & Atomic Stored Procedures
- **Security & TOTP**: Node.js `crypto` HMAC-SHA256 (RFC 6238 compliant)
- **Session Management**: [jose](https://github.com/panva/jose) (HMAC SHA-256 JWTs in HTTP-only cookies)
- **Validation**: [Zod](https://zod.dev/)
- **Hosting**: [Vercel](https://vercel.com/)

---

## 🔒 Security Architecture

| Security Measure | Implementation |
| :--- | :--- |
| **TOTP Code Isolation** | `STAFF_TOTP_SECRET` is strictly server-side. The staff dashboard fetches only the generated 6-digit code. |
| **Replay & Drift Protection** | In-memory token cache prevents reusing the same 30s code for the same student. Documented ±30s clock-drift tolerance. |
| **Brute-Force Protection** | Rate limiters on verification (`VERIFY_STAMP`: 6 req/min per IP) and staff login (5 attempts/15 min). |
| **Tamper-Proof Sessions** | Staff sessions are stored in HTTP-only, SameSite=Lax, Secure cookies (`yec_admin_session`). `localStorage` is never used. |
| **Atomic Transactions** | Row-level locking (`SELECT ... FOR UPDATE`) in PostgreSQL prevents double-redemption and concurrent stamp exploits. |
| **Information Minimization** | Customer lookup returns only `{ student_id, current_stamps, lifetime_purchases, free_drinks_available }`. |

---

## 🚀 Quick Start & Local Development

### 1. Prerequisites
- **Node.js**: v18.17+ or v20+ (tested on v22)
- **NPM**: v9+

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure `.env.local`:
```env
# Staff Admin Master Password
ADMIN_PASSWORD=admin123

# Session Encryption Secret (32+ characters)
SESSION_SECRET=fruity-fusion-bar-secret-dev-key-32chars-long-2026!

# TOTP Secret for 30-Second Rolling Verification Codes
STAFF_TOTP_SECRET=fruity-fusion-totp-secure-hmac-secret-dev-2026!

# Number of stamps for 1 free drink (default is 3, can be set to 5)
STAMPS_REQUIRED=3

# Optional: Supabase Credentials (app runs with instant in-memory dev store if omitted)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here
```

> **Note for Local Testing:** If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are left blank, the application automatically runs in an **in-memory development mode**. You can test purchases, rolling codes, redemptions, and the full flow immediately!

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000):
- Student Login & Dashboard: [http://localhost:3000/](http://localhost:3000/)
- Staff Portal: [http://localhost:3000/admin](http://localhost:3000/admin) (or click "Staff access" on the homepage)

---

## 🗄️ Supabase PostgreSQL Setup & Migration

If using a persistent Supabase database:

1. Open your Supabase project dashboard at [supabase.com](https://supabase.com).
2. Go to **SQL Editor**.
3. Open `supabase/schema.sql` from this repository and run the script.
4. The schema includes:
   - `public.students` table with RLS enabled.
   - `public.transactions` audit table with RLS enabled.
   - `public.record_student_purchase` atomic function with row locking and reward pending check.
   - `public.redeem_student_reward` atomic function with balance validation.

---

## 🧪 Testing the Complete Workflow

### Step 1: Staff Portal & Rolling Code
1. On `http://localhost:3000/`, click **Staff access** at the bottom of the card.
2. Enter password `admin123` and sign in.
3. Observe the staff dashboard at `/admin`:
   - Note the large **6-digit verification code**.
   - Watch the countdown timer decrease from 30s to 0s.
   - At 0s, observe the code automatically rotate and the **New Code Active** badge flash.

### Step 2: Student Login & Earn Stamp (+1 Stamp)
1. In another browser tab (or window), visit `http://localhost:3000/`.
2. Enter Student ID `8974743` and click **Sign In to My Loyalty**.
3. The student dashboard displays `0 / 3 Stamps`.
4. Click the prominent **+1 Stamp (Enter Staff Code)** button.
5. In the modal:
   - Enter an incorrect code (e.g. `000000`) -> Observe the error message.
   - Enter the current 6-digit code shown on the staff dashboard -> Click **Verify & Stamp**.
6. The modal closes, confetti fires, and progress updates to `1 / 3 Stamps`!
7. Try entering the same code again -> Rejected with replay error.

### Step 3: Reaching the Reward Threshold
1. Wait for the next 30s rolling code and add stamp 2.
2. Wait for the next code and add stamp 3.
3. Once 3 stamps are collected:
   - Celebratory **1 Free Drink Ready to Claim!** badge appears.
   - The **+1 Stamp** button is paused with a notice to claim the reward at the counter.

### Step 4: Staff Redeems Reward
1. In the staff tab at `/admin`, enter Student ID `8974743` under **Redeem Customer Free Drink**.
2. Click **Check Status**.
3. Observe **★ Free Drink Ready!**.
4. Click **Redeem Free Drink** -> Click **Confirm Redemption**.
5. Success toast appears; 3 stamps are deducted (cycle resets to `0 / 3`), and lifetime redemptions updates to `1`.
6. Return to the student tab and click **Refresh stamps** -> Observe progress reset to `0 / 3` for the new cycle, with the "+1 Stamp" button active again!

---

## ☁️ Deployment to Vercel

1. Push your repository to GitHub / GitLab.
2. Import the project into [Vercel](https://vercel.com/new).
3. In **Environment Variables**, add:
   - `ADMIN_PASSWORD`: Strong password for stall staff.
   - `SESSION_SECRET`: Random 32+ character string (e.g. `openssl rand -hex 32`).
   - `STAFF_TOTP_SECRET`: Random 32+ character string for TOTP code generation.
   - `SUPABASE_URL`: Your Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role secret key.
   - `STAMPS_REQUIRED`: e.g. `3` or `5`.
4. Click **Deploy**.

---

## 📄 License
MIT License. Built with ❤️ for student drink stalls and campus cafes.
