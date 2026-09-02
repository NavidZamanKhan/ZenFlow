# ZenFlow Web Platform

A calm, full-stack productivity and financial workspace designed to unify task management, calendar scheduling, multi-currency expense tracking, budgets, and visual insights into a single interface.

Built with a modern Next.js App Router frontend and a Django REST Framework backend with PostgreSQL.

---

## Overview

ZenFlow helps users organize their daily workload and personal finances without switching between disconnected applications. The centralized Overview dashboard surfaces today's focus: open task queues, upcoming reminders, weekly productivity velocity, and monthly spending summaries at a glance. Dedicated sub-modules provide full task and calendar workflows, expense logging, interactive category budgets, and analytical insights.

The platform employs a decoupled full-stack architecture where the Next.js client interacts with a REST API secured by JWT authentication and Argon2 password hashing.

---

## User Interface Showcase

### 1. Public Portal & Workspace Overview

<table>
  <thead>
    <tr>
      <th width="50%" align="center">Landing Page & Public Portal</th>
      <th width="50%" align="center">Central Overview Dashboard</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center" valign="top">
        <img src="Screenshots/Landing%20Page.png" width="100%" alt="ZenFlow Landing Page" />
      </td>
      <td align="center" valign="top">
        <img src="Screenshots/Dashboard.png" width="100%" alt="ZenFlow Dashboard Overview" />
      </td>
    </tr>
    <tr>
      <td align="center" valign="top">Public marketing interface showcasing platform capabilities, workflow highlights, security standards, and authentication entry points.</td>
      <td align="center" valign="top">Personalized workspace displaying today's tasks, weekly productivity velocity curves, scheduled reminders, and monthly financial summaries.</td>
    </tr>
  </tbody>
</table>

---

### 2. Financial Management & Analytics

<table>
  <thead>
    <tr>
      <th width="50%" align="center">Expense Tracking & Budgeting</th>
      <th width="50%" align="center">Spending Analytics & Visualizations</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center" valign="top">
        <img src="Screenshots/Expense.png" width="100%" alt="ZenFlow Expenses Tracker" />
      </td>
      <td align="center" valign="top">
        <img src="Screenshots/Insights.png" width="100%" alt="ZenFlow Insights Analytics" />
      </td>
    </tr>
    <tr>
      <td align="center" valign="top">Multi-currency financial logging with category filters, payment method tagging, search, and interactive monthly budget gauges.</td>
      <td align="center" valign="top">Analytical intelligence suite featuring category distribution donut charts, daily spending wave curves, and transaction volume trends.</td>
    </tr>
  </tbody>
</table>

---

## Core Capabilities

### Productivity & Workflow Management
* Overview Dashboard: Instant high-level summary of open tasks, weekly completion rates, upcoming calendar events, and real-time spending.
* Advanced Task Lifecycle: Full CRUD management with priority tiers (High, Medium, Low), category tagging, optional due dates/times, and overdue indicators.
* Interactive Calendar: FullCalendar integration offering Month, Week, Day, and List views with drag-and-drop rescheduling and synchronized task deadlines.
* Spotlight Global Search: Rapid keyboard-driven search (`/`) indexing tasks, calendar events, expenses, and workspace settings.

### Personal Finance & Multi-Currency Engine
* Expense Management: Multi-currency expense entry supporting category tagging, payment method tracking, and full-text search.
* Budget Controls: Configurable monthly spending limits with category-specific allocations and real-time visual progress gauges.
* Multi-Currency Engine: Display currency configuration with automatic conversion and precision rounding heuristics.
* Visual Insights: Spending analytics powered by Recharts, including category donut distributions, payment method breakdowns, and daily spending wave charts.

### Security, Theming & Identity
* Comprehensive Authentication: Email and password registration with 6-digit email OTP verification, native Google OAuth 2.0, and JWT token management.
* Account Security: Password change workflows and account deletion safeguarded by OTP verification.
* Curated Theming: System, Light, and Dark modes with four selectable accent palettes (ZenFlow Blue, Soft Teal, Violet, Coral).

---

## Technical Architecture

```text
┌───────────────────────────────┐              REST + JWT             ┌──────────────────────────────┐
│       Next.js Frontend        │  ◄────────────────────────────────► │    Django REST Framework     │
│   (React 19 / TypeScript)     │           JSON over HTTPS           │   + PostgreSQL (Supabase)    │
└───────────────────────────────┘                                     └──────────────────────────────┘
```

* **Frontend Architecture:** Next.js App Router, Domain-driven Custom React Hooks (`use-tasks`, `use-expenses`, `use-budget`, `use-events`), and centralized AuthContext for session hydration.
* **Backend Architecture:** Django REST Framework with strict layered separation: `Views -> Serializers -> Services -> Models` with SimpleJWT and Argon2 password hashing.

---

## Project Structure

```text
ZenFlow/
├── Screenshots/              # Product screenshots for documentation
│   ├── Landing Page.png      # Marketing portal screenshot
│   ├── Dashboard.png         # Overview workspace screenshot
│   ├── Expense.png           # Multi-currency expense screenshot
│   └── Insights.png          # Visual analytics screenshot
├── frontend/                 # Next.js web application
│   └── src/
│       ├── app/              # App Router pages and route handlers
│       ├── components/       # Landing, dashboard, auth, and shared UI primitives
│       ├── hooks/            # Domain-specific data and state management hooks
│       ├── lib/              # API client, authentication, currency conversion
│       └── types/            # TypeScript schemas and data interfaces
├── backend/                  # Django REST API service
│   ├── config/               # Settings, root URLs, and WSGI/ASGI configuration
│   ├── users/                # Authentication, user profile, OTP, and Google OAuth
│   ├── tasks/                # Task CRUD and deadline logic
│   ├── events/               # Calendar events and scheduling
│   ├── expenses/             # Expense transactions and multi-currency models
│   └── budget/               # Monthly and category budget limit models
├── netlify.toml              # Frontend deployment configuration
└── README.md                 # Project documentation
```

---

## Technology Stack

### Frontend
* Framework: Next.js 16 (App Router), React 19, TypeScript
* Styling: Tailwind CSS v4, Lucide Icons
* Component Primitives: Radix UI / shadcn/ui
* Animations: Framer Motion
* Data Visualization: Recharts, FullCalendar
* Forms & Validation: React Hook Form, Zod
* Authentication: `@react-oauth/google`

### Backend & Infrastructure
* Framework: Django 6.0, Django REST Framework
* Database: PostgreSQL (via `psycopg` and `dj-database-url`)
* Authentication: `djangorestframework-simplejwt`, Argon2
* CORS & Headers: `django-cors-headers`
* Production Serving: Gunicorn, Whitenoise
* Deployment: Netlify (Frontend), Render (Backend), Supabase (Database)

---

## Getting Started

### Prerequisites

* Node.js 18+ and npm
* Python 3.12+
* PostgreSQL 14+

### 1. Clone the Repository

```bash
git clone https://github.com/NavidZamanKhan/ZenFlow.git
cd ZenFlow
```

### 2. Backend Setup

```bash
cd backend
python -m venv .venv

# Activate virtual environment
# On macOS / Linux:
source .venv/bin/activate
# On Windows:
# .venv\Scripts\activate

pip install -r requirements.txt
```

Configure `backend/.env` based on `backend/.env.example`, then execute migrations:

```bash
python manage.py migrate
python manage.py runserver
```

The Django API server will start on `http://localhost:8000`.

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Configure `frontend/.env.local` based on `frontend/.env.example`, then run the development server:

```bash
npm run dev
```

The Next.js web application will start on `http://localhost:3000`.

---

## API Route Summary

All authenticated endpoints require an `Authorization: Bearer <access_token>` header.

| Endpoint Prefix | Description |
| :--- | :--- |
| `/api/auth/` | Registration, OTP verification/resend, login, Google OAuth, profile, and account deletion |
| `/api/tasks/` | Task CRUD operations with priority tags and deadline timestamps |
| `/api/events/` | Calendar event management and schedule queries |
| `/api/expenses/` | Expense transaction logging, filtering, and currency conversion |
| `/api/budget/` | Monthly budget limits and category allocation endpoints |

---

## Ecosystem Repositories

* Web Application (Full-Stack): [ZenFlow](https://github.com/NavidZamanKhan/ZenFlow)
* Mobile Application (iOS & Android): [ZenFlow-Flutter](https://github.com/NavidZamanKhan/ZenFlow-Flutter)

---

## License

Private and proprietary. All rights reserved.
