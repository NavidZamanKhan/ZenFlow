# ZenFlow

**A calm productivity and expense workspace** for organizing tasks, calendar events, spending, budgets, and insights in one place.

ZenFlow is a full-stack web application built with a **Next.js** frontend and a **Django REST Framework** backend. It combines day-to-day task management with personal finance tracking behind a minimal, distraction-free interface.

> The live application link is available in the repository **About** section on GitHub.

![ZenFlow Landing Page](Screenshots/Landing%20Page.png)

---

## Table of contents

- [Overview](#overview)
- [Screenshots](#screenshots)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [API overview](#api-overview)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Team](#team)
- [License](#license)

---

## Overview

ZenFlow helps users stay on top of work and money without switching between multiple tools. The **Overview** dashboard surfaces today's focus: open tasks, upcoming reminders, weekly productivity, and monthly spending at a glance. Dedicated pages extend that foundation with full task and calendar workflows, expense logging, budget tracking, and visual insights.

The application uses a **decoupled architecture**: the React frontend communicates with a REST API secured by JWT authentication, while PostgreSQL persists user data on the backend.

**Why ZenFlow?**

| Challenge | ZenFlow approach |
|-----------|------------------|
| Scattered productivity tools | Tasks, calendar, and reminders in one dashboard |
| No spending context while planning | Expenses and budget alongside daily tasks |
| Cluttered finance UIs | Clean charts and summaries on the Insights page |
| Generic SaaS look | Custom accent theming and a calm visual language |

---

## Screenshots

### Landing page

Marketing site with feature highlights, about section, contact, and authentication entry points.

![ZenFlow Landing Page](Screenshots/Landing%20Page.png)

### Dashboard (Overview)

Personalized greeting, task snapshot, productivity chart, reminders, and expense summary.

![ZenFlow Dashboard](Screenshots/Dashboard.png)

### Expenses

Expense list with category, payment method, search, filters, and multi-currency support.

![ZenFlow Expenses](Screenshots/Expense.png)

### Insights

Spending analytics with category breakdowns, trends, and summary cards.

![ZenFlow Insights](Screenshots/Insights.png)

---

## Features

### Productivity

| Feature | Description |
|---------|-------------|
| **Overview dashboard** | Greeting, tasks card, weekly productivity chart, reminders, and expenses snapshot |
| **Tasks** | CRUD with priorities, categories, optional due date and time (`HH:mm`), filters, sorting, and time-aware overdue logic |
| **Calendar** | Month, week, day, and list views (FullCalendar); create events and drag to reschedule; task deadlines shown as all-day or timed events |
| **Reminders** | Upcoming task dues and calendar events surfaced on the dashboard |
| **Global search** | Spotlight search (`/`) across tasks, expenses, events, and settings |
| **Notifications** | In-app notification bell in the dashboard chrome |

### Finance

| Feature | Description |
|---------|-------------|
| **Expenses** | Log spending with category and payment method; search, filter, and sort |
| **Budget** | Monthly budget with remaining balance and progress visualization |
| **Multi-currency** | Display currency preferences with conversion for summaries |
| **Insights** | Totals, category and payment donuts, weekly/daily charts, trend cards |

### Account and settings

| Feature | Description |
|---------|-------------|
| **Authentication** | Email/password signup with OTP verification, login, Google OAuth, logout |
| **Security** | Password change and account deletion via OTP flows |
| **Appearance** | Selectable brand accents (blue, teal, violet, coral) and UI density |
| **Profile** | User profile from the account menu |

### Landing and marketing

| Feature | Description |
|---------|-------------|
| **Public site** | Landing page with features, about, contact (mailto), and auth CTAs |
| **Theming** | Light-first UI with dark-mode shell support and accent customization |

---

## Tech stack

### Frontend (`frontend/`)

| Technology | Role |
|------------|------|
| **Next.js 16** (App Router) | Routing, SSR, and production builds |
| **React 19** · **TypeScript** | UI components and type safety |
| **Tailwind CSS v4** | Utility-first styling |
| **shadcn/ui** (Base UI) | Accessible UI primitives |
| **Framer Motion** | Page and list animations |
| **FullCalendar** | Interactive calendar views |
| **Recharts** | Insights and productivity charts |
| **React Hook Form** + **Zod** | Form validation |
| **next-themes** · **Sonner** | Theme handling and toasts |
| **@react-oauth/google** | Google sign-in |

### Backend (`backend/`)

| Technology | Role |
|------------|------|
| **Django 6** · **Django REST Framework** | API layer and business logic |
| **PostgreSQL** (psycopg) | Primary data store |
| **SimpleJWT** | Access and refresh token auth |
| **Argon2** | Password hashing |
| **django-cors-headers** | Cross-origin API access |
| **gunicorn** · **whitenoise** | Production serving |
| **dj-database-url** | Environment-based DB configuration |

---

## Architecture

```text
┌─────────────────────┐         REST + JWT          ┌──────────────────────────┐
│   Next.js frontend  │  ◄──────────────────────►  │  Django REST Framework   │
│   (React / TS)      │         JSON over HTTPS     │  + PostgreSQL            │
└─────────────────────┘                             └──────────────────────────┘
```

**Backend pattern:** Views → Serializers → Services → Models  
**Frontend pattern:** Auth context for session hydration; domain hooks (`use-tasks`, `use-expenses`, `use-budget`, `use-events`, …) for data fetching and optimistic updates.

### Main routes

| Path | Purpose |
|------|---------|
| `/` | Landing page |
| `/login` · `/register` | Authentication |
| `/dashboard` | Overview |
| `/dashboard/tasks` | Task management |
| `/dashboard/calendar` | Calendar |
| `/dashboard/expenses` | Expense list |
| `/dashboard/expenses/budget` | Budget |
| `/dashboard/insights` | Analytics |
| `/dashboard/settings` | Preferences and security |
| `/dashboard/profile` | User profile |

---

## Project structure

```text
ZenFlow/
├── Screenshots/              # Product screenshots for documentation
├── frontend/                 # Next.js application
│   └── src/
│       ├── app/              # App Router pages
│       ├── components/       # Landing, dashboard, auth, shared UI
│       ├── hooks/            # Data and UI hooks
│       ├── lib/              # API client, auth, currency, search
│       └── types/            # Shared TypeScript types
├── backend/                  # Django project
│   ├── config/               # Settings and root URLs
│   ├── users/                # Auth, profile, OTP, Google
│   ├── tasks/                # Task API
│   ├── events/               # Calendar events API
│   ├── expenses/             # Expense API
│   ├── budget/               # Budget API
│   ├── reminders/            # URL stub (future)
│   └── analytics/            # URL stub (future)
├── netlify.toml              # Frontend deploy (Netlify + Next.js plugin)
└── README.md
```

---

## Getting started

### Prerequisites

- **Node.js** 18+
- **Python** 3.12+
- **PostgreSQL** 14+ (17 recommended)

### 1. Clone the repository

```bash
git clone https://github.com/NavidZamanKhan/ZenFlow.git
cd ZenFlow
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
```

Copy `backend/.env.example` to `backend/.env` and configure PostgreSQL credentials (and optional email / Google client ID).

```bash
python manage.py migrate
python manage.py runserver
```

The API runs at [http://localhost:8000](http://localhost:8000) by default.

### 3. Frontend setup

```bash
cd frontend
npm install
```

Copy `frontend/.env.example` to `frontend/.env.local` if using Google OAuth (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`). Set `NEXT_PUBLIC_API_URL` to point at your backend when needed.

```bash
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000) by default.

### 4. Development commands

```bash
# Frontend
cd frontend && npm run build && npm run lint

# Backend (with venv active)
cd backend && python manage.py migrate && python manage.py test
```

---

## API overview

Authenticated routes require `Authorization: Bearer <access_token>`.

| Prefix | Description |
|--------|-------------|
| `/api/auth/` | Register, OTP verify/resend, login, Google, logout, profile, password and account deletion |
| `/api/tasks/` | Task CRUD (includes optional `dueDate` and `dueTime`) |
| `/api/events/` | Calendar event CRUD |
| `/api/expenses/` | Expense CRUD |
| `/api/budget/` | Budget read/update |
| `/api/reminders/` | Reserved for future use |
| `/api/analytics/` | Reserved for future use |

---

## Deployment

| Layer | Platform |
|-------|----------|
| **Frontend** | Netlify via `netlify.toml` and `@netlify/plugin-nextjs` |
| **Backend** | Django host with PostgreSQL (e.g. Render with `DATABASE_URL` via `dj-database-url`) |

---

## Roadmap

- Silent JWT access-token refresh (refresh tokens stored; frontend retry wiring in progress)
- Dedicated `/api/reminders/` and `/api/analytics/` backends (client-driven reminders and insights today)
- Full dark and system theme persistence
- Broader accessibility contrast polish for accent palettes

---

## Team

Built by [NavidZamanKhan](https://github.com/NavidZamanKhan) and [ak1bhasan](https://github.com/ak1bhasan).

---

