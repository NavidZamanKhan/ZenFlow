# ZenFlow

A calm desktop-first productivity dashboard designed for working professionals to manage tasks, expenses, reminders, and analyze productivity—all in one place.

## Features

- **Task Management**: Organize and track your daily tasks efficiently.
- **Expense Tracking**: Keep a close eye on your finances and expenditures.
- **Reminders**: Stay on top of important deadlines with a robust reminder system.
- **Interactive Calendar**: Visualize your schedule and tasks using FullCalendar.
- **Analytics Dashboard**: Gain insights into your productivity and spending habits with interactive charts powered by Recharts.
- **Modern UI**: A beautiful, calm, and responsive desktop-first design featuring animations (Framer Motion) and icons (Lucide React).
- **Secure Authentication**: Built-in user management and authentication.

## Tech Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (React)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Libraries**: 
  - Framer Motion (Animations)
  - Recharts (Data Visualization)
  - FullCalendar (Calendar Integration)
  - Lucide React (Icons)
  - Sonner (Toast Notifications)

### Backend
- **Framework**: [Django](https://www.djangoproject.com/) & Django REST Framework
- **Language**: Python 3
- **Database**: PostgreSQL
- **Key Packages**:
  - `django-cors-headers` (CORS handling)
  - `psycopg2-binary` (PostgreSQL adapter)
  - `python-decouple` (Environment variable management)
  - `pillow` (Image processing)

## Project Structure

The repository is split into two main directories:

- `/frontend`: Contains the Next.js frontend application.
- `/backend`: Contains the Django project and its respective apps (`users`, `tasks`, `expenses`, `reminders`, `analytics`).

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (3.10+)
- [PostgreSQL](https://www.postgresql.org/)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables (if applicable):
   - Configure your `.env` file with your PostgreSQL database credentials and Django secret key.
5. Apply database migrations:
   ```bash
   python manage.py migrate
   ```
6. Start the development server:
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   # or yarn install / pnpm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.