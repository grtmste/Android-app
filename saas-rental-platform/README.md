# RentPro — Equipment Rental & Event Management SaaS

A full-stack SaaS platform inspired by [Rentman](https://rentman.io) for managing equipment rentals, crew scheduling, project bookings, and event production workflows.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui components |
| State/Data | TanStack Query (React Query) |
| Charts | Recharts |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JWT (JSON Web Tokens) |
| API Client | Axios |

---

## Features

### Core Modules
- **Dashboard** — KPI cards, revenue chart, upcoming & recent projects
- **Equipment Management** — CRUD, availability tracking, check-in/check-out log, QR code labels
- **Project & Booking Management** — Status workflow (Draft → Confirmed → In Progress → Completed), linked equipment & crew, Kanban task board
- **Crew Scheduling** — Cards & schedule view, filter by availability/skill, drag-and-drop ready
- **Quoting** — Line-item builder, tax calculation, status workflow, PDF print view
- **Invoicing** — Full invoice lifecycle (Draft → Sent → Paid → Overdue), balance tracking, print/PDF
- **CRM (Clients)** — Client profiles, communication log (notes, emails, calls, meetings), project & invoice history
- **Analytics** — Revenue by month (area chart), equipment utilization by category (bar chart), projects by status (pie chart), top clients, crew hours

### Auth & Access
- Register / Login with JWT
- Role-based access: **Admin**, **Manager**, **Crew Member**
- Protected routes — redirect to login if not authenticated

### Landing Page
- Marketing page inspired by rentman.io
- Sticky navbar, hero section, customer logo bar
- 3-column feature highlights
- 5 alternating deep-feature sections
- 6 industry use-case cards
- 6 "Why Us" value-proposition cards
- Final CTA banner + footer

---

## Project Structure

```
saas-rental-platform/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js       # PostgreSQL pool
│   │   │   ├── schema.sql        # All table definitions
│   │   │   └── seed.js           # Sample data seeder
│   │   ├── controllers/          # Route handlers
│   │   │   ├── authController.js
│   │   │   ├── dashboardController.js
│   │   │   ├── equipmentController.js
│   │   │   ├── projectsController.js
│   │   │   ├── crewController.js
│   │   │   ├── clientsController.js
│   │   │   ├── quotesController.js
│   │   │   ├── invoicesController.js
│   │   │   ├── analyticsController.js
│   │   │   └── notificationsController.js
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT authenticate + authorize
│   │   │   └── errorHandler.js
│   │   ├── routes/               # Express routers
│   │   └── index.js              # Entry point
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/           # Sidebar, TopBar, AppLayout
│   │   │   └── ui/               # Button, Card, Dialog, Input, etc.
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx   # Auth state + JWT storage
│   │   ├── lib/
│   │   │   ├── api.ts            # Axios client + all API calls
│   │   │   └── utils.ts          # Formatting helpers
│   │   ├── pages/
│   │   │   ├── landing/          # Marketing landing page
│   │   │   ├── auth/             # Login + Register
│   │   │   └── app/              # All authenticated pages
│   │   ├── types/index.ts        # TypeScript interfaces
│   │   ├── App.tsx               # Router + route guards
│   │   └── main.tsx              # Entry point
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
└── README.md
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+

### 1. Clone & Install

```bash
# Backend
cd saas-rental-platform/backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/rentpro
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

### 3. Create Database

```bash
# Using psql
psql -U postgres -c "CREATE DATABASE rentpro;"
```

### 4. Run Database Seed

This creates all tables and populates sample data (5 clients, 10 equipment items, 3 projects, 4 crew members, quotes, invoices, etc.):

```bash
cd backend
npm run seed
```

### 5. Start the Application

In two terminals:

```bash
# Terminal 1 — Backend API
cd backend
npm run dev
# API running at http://localhost:5000

# Terminal 2 — Frontend
cd frontend
npm run dev
# App running at http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Demo Accounts

After seeding, these accounts are available:

| Role | Email | Password |
|---|---|---|
| Admin | admin@rentpro.com | password123 |
| Manager | sarah@rentpro.com | password123 |
| Crew | tom@rentpro.com | password123 |

> The login page has quick-fill buttons for each demo account.

---

## API Endpoints

All API routes are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>` header.

| Module | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Dashboard | `GET /api/dashboard/stats` |
| Equipment | `GET/POST /api/equipment`, `GET/PUT/DELETE /api/equipment/:id`, `POST /api/equipment/:id/checkout`, `POST /api/equipment/:id/checkin` |
| Projects | `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id`, `GET/POST /api/projects/:id/tasks`, `PUT /api/projects/:id/tasks/:taskId` |
| Crew | `GET/POST /api/crew`, `GET/PUT/DELETE /api/crew/:id`, `GET /api/crew/schedule`, `POST /api/crew/:id/availability` |
| Clients | `GET/POST /api/clients`, `GET/PUT/DELETE /api/clients/:id`, `POST /api/clients/:id/logs` |
| Quotes | `GET/POST /api/quotes`, `GET/PUT/DELETE /api/quotes/:id` |
| Invoices | `GET/POST /api/invoices`, `GET/PUT/DELETE /api/invoices/:id` |
| Analytics | `GET /api/analytics/revenue` |
| Notifications | `GET /api/notifications`, `GET /api/notifications/unread-count`, `PUT /api/notifications/:id/read`, `PUT /api/notifications/mark-all-read` |

---

## Design

- **Primary color**: Deep Blue `#1A3C6E`
- **Accent color**: Orange `#F97316`
- **Background**: White with subtle gray cards
- Clean SaaS aesthetic with smooth hover states and transitions
- Fully responsive (mobile-friendly sidebar collapses gracefully)

---

## Sample Data (Seeded)

- **5 Clients**: James Wilson, Emma Davis, Michael Chen, Sofia Rodriguez, David Kim
- **10 Equipment Items**: LED Par Cans, Moving Heads, Truss Sections, Audio Mixers, Line Array Speakers, Subwoofers, LED Video Wall Panels, Video Switcher, Generator, Stage Platforms
- **3 Projects**: Summer Music Festival, Corporate Gala Dinner, Kim Wedding Reception
- **4 Crew Members**: Alex Turner (Lighting), Maria Santos (Audio), Jake Robinson (Video), Priya Patel (Stage Management)
- **3 Quotes** + **3 Invoices** (one paid, one sent, one overdue)
- Communication logs and notifications pre-populated
