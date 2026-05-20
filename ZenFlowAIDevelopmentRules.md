# ZenFlow AI Development Rules

These rules must be followed by any AI agent working on this project.

ZenFlow is a calm, desktop-first productivity dashboard for working people. The goal is premium, clean, maintainable software, not feature-heavy chaos. Build it like a polished product: fewer features, better execution.

---

## Project Stack

Frontend:
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Recharts
- Lucide React
- Framer Motion
- Sonner

Backend:
- Django
- Django REST Framework
- PostgreSQL
- python-decouple
- django-cors-headers

Repository structure:
```txt
ZenFlow/
├── backend/
└── frontend/
```

---

## Core Product Scope

Only build the core features unless the user explicitly approves expansion:

* Google login/authentication
* Dashboard overview
* Todo/task management
* Calendar planning
* Reminders
* Expense tracking
* Charts and analytics
* Settings/profile
* Light/dark zen theme

Do not add AI features, chatbots, habit trackers, notes, social features, or unrelated modules unless directly requested.

---

## Before Implementing Any Feature

Before writing or changing code, the agent must provide:

1. A short implementation plan
2. The exact files that will be created or modified
3. The reason each file is needed
4. Any package/install command required
5. Any database migration required
6. Any risk or assumption

Do not modify code until the plan is clear.

---

## File Modification Rules

* Modify only files related to the current task.
* Do not rewrite entire files unless necessary.
* Do not touch `.env`, secrets, generated files, `node_modules`, `.next`, `venv`, or migration files unless the task requires it.
* Do not rename folders, apps, models, routes, or config files without explicit approval.
* Do not delete working code without explaining why.
* If a file becomes too large, suggest splitting it before adding more logic.

---

## Architecture Rules

Keep the code clean, modular, and beginner-readable.

Frontend:

* Use small reusable components.
* Keep page files clean.
* Move repeated UI into `components/`.
* Move API functions into `lib/api/`.
* Move TypeScript types into `types/`.
* Keep styling consistent with the ZenFlow theme.
* Avoid deeply nested components.
* Avoid unnecessary state management libraries.
* Use local state first, then Context/Zustand only if truly needed.

Backend:

* Keep Django apps feature-based.
* Put API serializers in `serializers.py`.
* Put DRF views/viewsets in `views.py`.
* Put routes in each app’s `urls.py` where useful.
* Keep business logic out of models when it grows.
* Use PostgreSQL-friendly field types.
* Never hardcode secrets or database credentials.
* Use migrations properly.
* Do not manually edit generated migration files unless absolutely required.

---

## Design System Rules

ZenFlow must feel calm, premium, and desktop-first.

Design principles:

* minimal UI
* generous spacing
* soft rounded corners
* subtle shadows
* clean typography
* calm colors
* smooth interactions
* no clutter
* no noisy gradients
* no childish icons
* no dashboard overload

Every page should feel like it belongs to the same product.

---

## Code Quality Rules

* Prefer simple code over clever code.
* Avoid over-engineering.
* Avoid huge files.
* Avoid duplicate logic.
* Use meaningful names.
* Add comments only when they clarify non-obvious logic.
* Do not use deprecated APIs.
* Do not add packages for simple problems.
* Do not leave console logs, debug prints, or commented-out dead code.
* Ensure TypeScript types are clean.
* Ensure Django code passes basic checks.

---

## API Rules

For every backend API feature:

* define the model first
* create serializer
* create view/viewset
* create route
* register route in project URLs
* test with simple request
* explain request/response shape

API responses should be consistent and frontend-friendly.

---

## Database Rules

* Use PostgreSQL during development.
* One project = one database.
* Use environment variables for database config.
* Always run:

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py check
```

after model changes.

Never push:

* `.env`
* local database files
* credentials
* generated environment folders

---

## Frontend Rules

When building frontend features:

* use TypeScript
* use Tailwind cleanly
* avoid inline messy style objects
* keep components reusable
* use loading and empty states
* handle errors gracefully
* keep desktop layout excellent first
* make mobile responsive only after desktop is clean

For charts:

* use Recharts
* keep charts readable
* do not overload graphs with unnecessary data

---

## Git Workflow Rules

Branch strategy:

```txt
main = stable
dev = active development
feature/... = individual work
```

Before starting work:

```bash
git checkout dev
git pull origin dev
git checkout -b feature/descriptive-name
```

After finishing work:

```bash
git add .
git commit -m "type: concise message"
git push origin feature/descriptive-name
```

Create pull requests into:

```txt
dev
```

Do not push feature branches directly into `main`.

---

## Git & Commit Responsibility Rules

The AI agent must NEVER:

* commit code
* push code
* merge branches
* create pull requests automatically
* modify git history
* force push
* delete branches

The AI agent may ONLY:

* suggest git commands
* suggest commit messages
* explain branch workflow
* explain merge strategy

After completing any task, the AI agent must provide:

1. Suggested commit message
2. Suggested branch name, if needed
3. Suggested PR title, if needed

The user will manually:

* review changes
* test functionality
* run project locally
* verify no unwanted files changed
* commit manually
* push manually
* create pull requests manually

The AI must assume that all code requires human verification before entering the repository.

Never assume code is production-ready without testing.

---

## Commit Message Rules

Use these commit types:

* `feat:` new feature
* `fix:` bug fix
* `refactor:` code cleanup
* `style:` UI/styling only
* `chore:` setup/config/tooling
* `docs:` documentation
* `test:` tests

Commit messages must be:

* lowercase
* short
* clear
* professional
* written in imperative style when possible

Examples:

```txt
feat: add task list api
style: build dashboard sidebar
fix: correct postgres env loading
refactor: split expense chart component
docs: update local setup guide
```

---

## After Implementing Any Feature

The agent must explain:

1. What changed
2. Why it changed
3. How data flows
4. How to test it
5. Modified files
6. Required commands
7. Suggested commit message

If migrations are created, mention them clearly.

---

## Testing Checklist

Before saying a task is done, verify what applies:

Backend:

```bash
python manage.py check
python manage.py migrate
python manage.py runserver
```

Frontend:

```bash
npm run lint
npm run dev
```

Git:

```bash
git status
```

The AI must never claim a feature is complete until:

* the project still runs
* no critical errors remain
* unrelated files were not accidentally modified

The agent must not claim success if commands were not run or if the result is unknown. Say what was not tested.

---

## AI Agent Behavior Rules

The AI agent must:

* act like a senior developer, not a code generator
* ask before making large architectural changes
* keep code minimal but complete
* prioritize maintainability
* avoid feature creep
* preserve existing working behavior
* explain important decisions simply
* never hide uncertainty
* never invent files or commands that do not exist
* never add fake integrations
* never commit or push without user approval

The user is learning and leading the project. The AI assists with architecture, implementation, debugging, and review.

---

## Security Rules

Never expose:

* secret keys
* database passwords
* OAuth client secrets
* production URLs with credentials
* `.env` contents

Authentication and authorization must be treated carefully. Do not generate insecure auth shortcuts just to make something work.

---

## Performance Rules

* Avoid unnecessary API calls.
* Avoid loading heavy libraries without reason.
* Keep dashboard components efficient.
* Fetch only needed data.
* Use pagination/filtering when lists can grow.
* Keep charts lightweight and readable.

---

## Final Rule

Build ZenFlow as a calm, polished, professional product. No messy code, no random features, no chaotic file edits, no “just make it work” shortcuts. Clean architecture first, then beautiful execution.
