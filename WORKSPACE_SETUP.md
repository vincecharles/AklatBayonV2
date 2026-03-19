# AklatBayonV2 - Workspace Setup Guide

## Overview

AklatBayonV2 is a Library Management System (LMS) for FEATI University, built with:
- **Backend**: Node.js, TypeScript, Drizzle ORM, PostgreSQL (Neon)
- **Frontend**: Vanilla HTML/CSS/JS with Tailwind CSS
- **Deployment**: Netlify (serverless functions)

## Prerequisites

- Node.js v18 or higher
- npm v8 or higher
- Git
- Netlify account (for deployment)
- PostgreSQL database URL (Neon recommended)

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/vincecharles/AklatBayonV2.git
cd AklatBayonV2
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- `@netlify/neon` - Netlify's PostgreSQL serverless driver
- `drizzle-orm` - Type-safe ORM
- `drizzle-kit` - Database migration tool
- `typescript` - TypeScript compiler

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
NETLIFY_DATABASE_URL=your_postgresql_connection_string
```

**For Netlify deployment**, set this in your Netlify dashboard:
- Go to Site settings → Environment variables
- Add `NETLIFY_DATABASE_URL` with your Neon database URL

### 4. Database Setup

The database schema is already defined in `db/schema.ts` with 16 tables.

#### Generate Migrations (if schema changes)

```bash
npm run db:generate
```

#### Apply Migrations

```bash
npm run db:migrate
```

#### View Database Studio (optional)

```bash
npm run db:studio
```

This opens Drizzle Studio at `https://local.drizzle.studio`

### 5. Seed the Database (optional)

The project includes a seed function at `netlify/functions/seed.mts` that can populate initial data:
- 7 default roles (Admin, Head Librarian, Librarian Staff, Faculty, Students, Student Assistants, Guests)
- 23 permissions
- Role-permission mappings
- Library of Congress Classification (LCC) data

## Development

### Project Structure

```
AklatBayonV2/
├── db/                          # Database layer
│   ├── schema.ts                # Drizzle schema (16 tables)
│   └── index.ts                 # Database client
├── migrations/                  # SQL migrations
│   └── 0000_third_the_hood.sql
├── netlify/functions/           # Serverless API
│   ├── api.mts                  # Main CRUD API
│   └── seed.mts                 # Database seeding
├── pages/                       # HTML pages (role-based)
├── js/                          # Frontend JavaScript
├── css/                         # Stylesheets
├── drizzle.config.ts            # Drizzle configuration
├── tsconfig.json                # TypeScript configuration
└── netlify.toml                 # Netlify configuration
```

### Local Development

For local testing with Netlify CLI:

```bash
npm install -g netlify-cli
netlify dev
```

This starts:
- Local dev server
- Netlify Functions at `/.netlify/functions/`

### Database Schema

16 tables organized by domain:

**Access Control**:
- `roles` - User roles
- `permissions` - Granular permissions (23 types)
- `role_permissions` - Many-to-many mapping
- `users` - System users

**Library Catalog**:
- `books` - Book inventory
- `authors`, `publishers`, `categories` - Book metadata
- `lcc_classes` - Library of Congress Classification

**Operations**:
- `transactions` - Borrow/return records
- `fines` - Fine management
- `reservations` - Book reservations
- `attendance` - RFID attendance tracking

**Others**:
- `students` - Student records
- `audit_logs` - System audit trail
- `settings` - Key-value configuration

### Available Scripts

```bash
npm run db:generate    # Generate migrations from schema
npm run db:migrate     # Apply migrations to database
npm run db:studio      # Open Drizzle Studio
npm run db:push        # Push schema directly (dev only)
```

## Deployment

### Netlify Deployment

1. **Connect Repository**:
   - Go to Netlify dashboard
   - New site from Git
   - Select this repository

2. **Build Settings**:
   - Build command: (none required)
   - Publish directory: `.` (root)
   - Functions directory: `netlify/functions`

3. **Environment Variables**:
   - Add `NETLIFY_DATABASE_URL` in Site settings

4. **Deploy**:
   - Push to `main` branch for automatic deployment
   - Or manually trigger deploy in Netlify dashboard

## Configuration Files

### drizzle.config.ts

Configures Drizzle ORM:
- Database dialect: PostgreSQL
- Connection: `process.env.NETLIFY_DATABASE_URL`
- Schema path: `./db/schema.ts`
- Migrations output: `./migrations`

### tsconfig.json

TypeScript configuration for:
- Target: ES2022
- Module: ESNext
- Includes: `db/**/*`, `netlify/functions/**/*`

### netlify.toml

Netlify deployment settings:
- Publish directory: `.`
- Security headers (X-Frame-Options, CSP, etc.)

## Key Features

1. **Role-Based Access Control (RBAC)**: 7 roles with 23 granular permissions
2. **Library Catalog**: Full cataloging with LCC support
3. **Circulation Management**: Borrowing, returning, reservations
4. **Fine Management**: Automated fine calculation and tracking
5. **RFID Attendance**: Student attendance tracking
6. **Audit Logging**: Complete audit trail of system operations

## Troubleshooting

### Permission Denied for drizzle-kit

In CI/CD environments, you may need to use:
```bash
npx drizzle-kit generate
```

### Database Connection Issues

Verify:
- `NETLIFY_DATABASE_URL` is set correctly
- Database is accessible from your environment
- Connection string format: `postgresql://user:password@host:port/database`

### TypeScript Compilation Errors

Ensure TypeScript is installed:
```bash
npm install --save-dev typescript
```

## Contributing

1. Create a feature branch
2. Make changes
3. Test locally with `netlify dev`
4. Submit a pull request

## License

ISC
