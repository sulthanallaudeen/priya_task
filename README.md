# Priya Task Manager

## Project Overview
Priya Task Manager is a full-stack task management application built with:
- Backend: Node.js + Express
- Frontend: React (Vite)
- Database: MySQL

It supports user registration/login, role-based dashboards, task lifecycle management, and admin controls for users and task statuses.

## Features Implemented
- Home page, Register page, Login page, Dashboard page
- Token-based authentication with persistent login
- User roles:
  - `user`: can manage their own tasks
  - `admin`: can view/manage all users and their tasks
- Task management:
  - create, edit, delete (modal popup)
  - search
  - status filter
  - priority filter
  - sort
  - pagination
  - due date
  - assignment to users (admin)
- Admin capabilities:
  - view users with task counts
  - change user role (`user`/`admin`)
  - activate/deactivate users
  - view filtered tasks by user
  - create/update/delete task statuses
- Default status set:
  - To Do
  - In Progress
  - Completed
  - Blocked

## Technologies Used
### Backend
- Node.js
- Express
- mysql2
- dotenv
- cors

### Frontend
- React 18
- Vite 5
- Custom CSS (responsive, modal-first dashboard UX)

### Database
- MySQL 8+
- PostgreSQL script provided for pgAdmin import reference (`database/schema_postgres.sql`)

## Project Structure
```text
.
|- backend/
|  |- src/
|  |  |- bootstrap/seedAdmin.js
|  |  |- config/db.js
|  |  |- middleware/authMiddleware.js
|  |  |- middleware/errorHandler.js
|  |  |- repositories/
|  |  |  |- sessionRepository.js
|  |  |  |- statusRepository.js
|  |  |  |- taskRepository.js
|  |  |  |- userRepository.js
|  |  |- routes/
|  |  |  |- authRoutes.js
|  |  |  |- statusRoutes.js
|  |  |  |- taskRoutes.js
|  |  |  |- userRoutes.js
|  |  |- utils/
|  |  |  |- security.js
|  |  |  |- validators.js
|  |  |- server.js
|  |- .env.example
|  |- package.json
|- frontend/
|  |- src/
|  |  |- api.js
|  |  |- App.jsx
|  |  |- main.jsx
|  |  |- styles.css
|  |- .env.example
|  |- package.json
|- database/
|  |- schema.sql
|  |- schema_postgres.sql
```

## Database Schema (MySQL)
Schema file: `database/schema.sql`

### Table: `users`
- `id` BIGINT PK
- `full_name` VARCHAR(120)
- `email` VARCHAR(180) UNIQUE
- `password_hash` VARCHAR(255)
- `role` ENUM(`admin`, `user`)
- `is_active` BOOLEAN-like TINYINT(1)
- timestamps

### Table: `task_statuses`
- `id` BIGINT PK
- `name` VARCHAR(40) UNIQUE
- timestamps

### Table: `tasks`
- `id` BIGINT PK
- `title` VARCHAR(120)
- `description` TEXT NULL
- `priority` ENUM(`low`, `medium`, `high`)
- `due_date` DATE NULL
- `status_id` FK -> `task_statuses.id`
- `assigned_to_user_id` FK -> `users.id`
- `created_by_user_id` FK -> `users.id`
- timestamps

### Table: `user_sessions`
- `id` BIGINT PK
- `user_id` FK -> `users.id`
- `token_hash` CHAR(64) UNIQUE
- `expires_at` DATETIME
- `created_at`

### Seed Data
- Default statuses: To Do, In Progress, Completed, Blocked
- Seed users:
  - `admin@ptm.com`
  - `user@ptm.com`

## API Endpoints
Base URL: `http://localhost:5000/api`

### Health
- `GET /health`

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me` (auth required)
- `POST /auth/logout` (auth required)

### Statuses
- `GET /statuses` (auth required)
- `POST /statuses` (admin)
- `PATCH /statuses/:id` (admin)
- `DELETE /statuses/:id` (admin)

### Tasks
- `GET /tasks` (auth required)
  - Query: `q`, `statusId`, `priority`, `sortBy`, `order`, `page`, `limit`, `assignedToUserId` (admin)
- `GET /tasks/:id` (auth required)
- `POST /tasks` (auth required)
- `PATCH /tasks/:id` (auth required)
- `DELETE /tasks/:id` (auth required)

### Users (Admin)
- `GET /users`
- `PATCH /users/:id`
- `GET /users/:id/tasks`

## Setup and Run Instructions
### 1) Prerequisites
- Node.js 18+
- npm 9+
- MySQL 8+

### 2) Database Setup (MySQL)
From project root:
```bash
mysql -u root -p < database/schema.sql
```

### 3) Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend runs at `http://localhost:5000`.

### 4) Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### 5) Deploy Frontend to Netlify
This project is configured for Netlify with `netlify.toml`:
- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`

Steps:
1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Netlify, create a new site from your repo.
3. In Netlify Site Settings -> Environment Variables, set:
   - `VITE_API_BASE_URL=https://your-backend-domain.com/api`
4. Deploy.

Notes:
- SPA fallback is configured in `frontend/public/_redirects`.
- Backend is a stateful Express + MySQL API, so host backend separately.
- After backend deploy, set backend `FRONTEND_ORIGIN` to your Netlify site URL.

### 6) Deploy Backend for Production
You can deploy backend using Docker on Render (blueprint file included: `render.yaml`).

Recommended deployment flow:
1. Provision a managed MySQL database (Railway MySQL, PlanetScale, Aiven, etc.).
2. Import schema:
   - Run `database/schema.sql` against your production DB.
3. Deploy backend service from this repo using Render:
   - Render reads `render.yaml` and `backend/Dockerfile`.
4. Set backend environment variables:
   - `FRONTEND_ORIGIN=https://your-site.netlify.app`
   - `DATABASE_URL=mysql://...`
   - `DB_SSL=true` (if provider requires TLS)
   - `DB_SSL_REJECT_UNAUTHORIZED=false` (set according to provider docs)
   - `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD` (strong secret)
5. Verify backend:
   - `https://your-backend-domain/api/health`
6. Update Netlify env:
   - `VITE_API_BASE_URL=https://your-backend-domain/api`
7. Redeploy Netlify frontend.

Files added for production backend deploy:
- `backend/Dockerfile`
- `backend/.dockerignore`
- `backend/.env.production.example`
- `render.yaml`

### 7) Default Login Accounts
From seed SQL:
- Admin:
  - Email: `admin@ptm.com`
  - Password: `Admin@123`
- User:
  - Email: `user@ptm.com`
  - Password: `User@1234`

You can also register new user accounts from the UI.

## Planning and Execution Approach
1. Redesigned data model first for multi-user + role-based access:
   - added users, statuses, sessions, and user-linked tasks.
2. Refactored backend into repository + route + middleware structure:
   - auth/session middleware,
   - admin guards,
   - ownership checks for user tasks.
3. Built frontend as multi-page app flow:
   - Home -> Register/Login -> Dashboard.
4. Implemented dashboard UX requirements:
   - modal create/edit/delete,
   - paginated task list,
   - search/filter/sort,
   - admin user/status management.
5. Verified backend syntax and frontend production build.

## Assumptions and Design Decisions
- Authentication is token-based using hashed session tokens stored in DB.
- Non-admin users can only access tasks assigned to themselves.
- Admin can assign tasks to any active user.
- Statuses are dynamic and managed by admin, but seeded with four defaults.
- `PATCH` endpoints are used for partial updates.
- Minimum one active admin is enforced during role/active updates.
- Backend runtime targets MySQL; PostgreSQL schema file is provided only for pgAdmin convenience/import workflows.
- Backend supports either discrete DB vars (`DB_HOST`, `DB_USER`, ...) or single `DATABASE_URL`.
