# ZenFlow

A desktop-first productivity platform and personal workspace designed for tasks, calendar events, expenses, and analytics.

ZenFlow provides a calm, minimal, and high-performance dashboard that consolidates daily workflows into a unified workspace without distraction.

Features
- Clean desktop-first dashboard with task, calendar, and expense management
- Secure user authentication with JWT token rotation and OTP email verification
- Protected client-side routes with automatic session hydration
- Responsive UI built with custom micro-animations and accessibility standards
- RESTful API architecture with a decoupled Django REST Framework backend

Tech Stack
- Next.js 16 (App Router)
- React 19
- TypeScript
- TailwindCSS v4
- Django 6
- Django REST Framework
- PostgreSQL 17
- SimpleJWT & Argon2id

Architecture
ZenFlow uses a decoupled frontend and backend architecture. The frontend consumes a REST API provided by the Django REST Framework.

frontend/ (Next.js) <---> API Gateway (REST / JWT) <---> backend/ (Django DRF)

The backend follows a strict layered architecture: Views (DRF APIView) -> Serializers -> Services (Business Logic) -> Models (Django ORM). The frontend uses React Context for auth state management and custom hooks for component data binding.

Project Structure

ZenFlow/
├── backend/
│   ├── config/              # Core Django settings, URLs, and WSGI/ASGI configs
│   ├── users/               # Authentication, JWT, and user management app
│   │   ├── services/        # Auth, OTP, and email business logic
│   │   ├── models.py        # Custom User and PendingRegistration models
│   │   ├── serializers.py   # Auth request/response serializers
│   │   └── views.py         # DRF authentication API views
│   ├── tasks/               # Task management endpoints and models
│   ├── events/              # Calendar events endpoints and models
│   ├── expenses/            # Expense tracking endpoints and models
│   ├── reminders/           # Reminders management app
│   ├── analytics/           # Productivity analytics engine
│   ├── requirements.txt     # Backend Python dependencies
│   └── manage.py
└── frontend/
    ├── src/
    │   ├── app/             # Next.js App Router (pages & layouts)
    │   │   ├── dashboard/   # Protected workspace dashboard sub-routes
    │   │   ├── login/       # Login page route
    │   │   └── register/    # Sign up page route
    │   ├── components/      # UI components & design system
    │   │   ├── auth/        # Auth forms and OTP verification dialog
    │   │   ├── dashboard/   # Dashboard widgets, header, and sidebar
    │   │   ├── shared/      # Modals and confirmation dialogs
    │   │   └── ui/          # Base UI primitive components
    │   ├── hooks/           # Custom React hooks (tasks, expenses, events)
    │   ├── lib/             # Typed API client, auth context, and store logic
    │   └── types/           # TypeScript interfaces and domain schemas
    └── package.json

Requirements
- Node.js 18 or later
- Python 3.12 or later
- PostgreSQL 17

Getting Started

1. Clone the repository:
```bash
git clone https://github.com/NavidZamanKhan/ZenFlow.git
cd ZenFlow
```

2. Set up the backend:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

3. Set up the frontend:
```bash
cd frontend
npm install
npm run dev
```

The frontend runs at http://localhost:3000 and connects to the backend at http://localhost:8000.

License
This project is licensed under the MIT License.
