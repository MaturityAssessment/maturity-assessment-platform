# Frontend - Maturity Assessment Platform

## Overview

This is the frontend application for the Maturity Assessment Platform, built with Next.js 14, React 18, and TypeScript.

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.8
- **UI Library**: React 18
- **Styling**: Tailwind CSS 3.4
- **Component Library**: shadcn/ui (Radix UI)
- **HTTP Client**: Axios 1.7
- **Charts**: Recharts 2.15
- **Animations**: Framer Motion 12
- **Form Handling**: React Hook Form 7.62
- **Validation**: Zod 3.23
- **Date Handling**: date-fns 3.6
- **Package Manager**: Yarn 4.5

## Project Structure

```
frontend/
├── public/
│   └── templates/              # XLSX model templates
│
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout with AuthProvider
│   │   ├── page.tsx            # Landing page
│   │   ├── login/              # Login page
│   │   ├── register/           # Registration page
│   │   ├── dashboard/          # User dashboard
│   │   ├── admin/              # Admin panel (user management)
│   │   ├── domains/            # Domain management
│   │   ├── maturity-models/    # Model management (list + detail)
│   │   ├── assessment/         # Assessment creation
│   │   ├── assessments/        # Assessment list (+ /all)
│   │   ├── evaluate/           # Assessment evaluation
│   │   └── results/            # Results viewing & export
│   │
│   ├── api/
│   │   ├── axios.ts            # Axios client with JWT interceptors
│   │   └── types.ts            # API type definitions
│   │
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components (button, input, form, label, modal)
│   │   ├── TopNavbar.tsx          # Navigation bar
│   │   ├── Button.tsx          # Custom button component
│   │   └── EvidenceUpload.tsx  # Evidence file upload component
│   │
│   ├── context/
│   │   └── AuthContext.tsx     # Authentication context (tokens, user)
│   │
│   ├── hooks/
│   │   └── useAuth.ts          # Authentication hook
│   │
│   └── lib/
│       └── utils.ts            # Utilities (cn, CSV export)
│
├── tests/
│   └── unit/                   # Unit tests, mirroring the src/ tree
│       ├── app/
│       └── lib/
│
├── .env.template               # Committed environment template
├── .env.local                  # Ignored local configuration (create it)
├── components.json             # shadcn/ui configuration
├── next.config.mjs             # Next.js configuration (standalone output)
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

## Quick Start

### Prerequisites

- Node.js 22.6+ (required by the TypeScript unit-test runner)
- Yarn (enable Corepack: `corepack enable`)

### Setup

```bash
# Install dependencies
yarn install

# Create environment file
cp .env.template .env.local
```

### Environment Variables

Create `.env.local` from `.env.template`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_TOKEN=auth_token
NEXT_PUBLIC_REFRESH_TOKEN=refresh_token
```

- `NEXT_PUBLIC_API_URL`: Backend API base URL
- `NEXT_PUBLIC_TOKEN`: localStorage key for JWT access token
- `NEXT_PUBLIC_REFRESH_TOKEN`: localStorage key for JWT refresh token

### Run Development Server

```bash
yarn dev
```

Open http://localhost:3000/filipevm.

### Build for Production

```bash
yarn build
yarn start
```

### Run Frontend Tests

```bash
# Run the complete unit suite
yarn test

# Run the suite and enforce the coverage baseline
yarn test:coverage
```

Tests live under `tests/unit/`, not beside application components. The test tree
mirrors `src/` so production directories remain focused. See the
[Frontend Development Guide](./DEVELOPMENT_GUIDE.md#testing) for focused commands,
coverage thresholds, and test-writing conventions.

## Pages / Routes

| Route                | Page               | Access         |
| -------------------- | ------------------ | -------------- |
| `/`                  | Landing page       | Public         |
| `/login`             | Login              | Public         |
| `/register`          | Registration       | Public         |
| `/dashboard`         | User dashboard     | Authenticated  |
| `/admin`             | Admin panel        | ADMIN          |
| `/domains`           | Domain management  | Authenticated  |
| `/maturity-models`   | Model list         | Authenticated  |
| `/maturity-models/[id]` | Model detail    | Authenticated  |
| `/assessment`        | Create assessment  | Authenticated  |
| `/assessments`       | My assessments     | Authenticated  |
| `/assessments/all`   | All assessments    | CURATOR/ADMIN  |
| `/evaluate`          | Evaluation list    | CURATOR+       |
| `/evaluate/[id]`     | Evaluate assessment| CURATOR+       |
| `/results`           | Results & export   | Authenticated  |

## Key Components

### Authentication

- `AuthContext.tsx` - Manages JWT tokens (access + refresh), user state, login/logout
- `useAuth.ts` - Hook for accessing auth state in components
- `axios.ts` - Interceptors automatically attach tokens and handle 401 responses

### Assessment

- `assessment/page.tsx` - Full assessment form with all question types
- `EvidenceUpload.tsx` - File upload component for evidence questions
- Supports: boolean, likert, open_answer, numeric, percentage, evidence, boolean_justification

### Results

- `ResultsContent.tsx` - Assessment results with Recharts visualizations
- `utils.ts` - CSV export functionality

## Docker

The frontend has a production container image for the online VM deployment.
Local development uses `yarn dev`; see the root Getting Started guide.

## Related Documentation

- [Frontend Development Guide](./DEVELOPMENT_GUIDE.md) - Coding standards and patterns
- [Project Overview](../PROJECT_OVERVIEW.md)
- [API Documentation](../backend/docs/api/README.md)
- [Architecture](../ARCHITECTURE.md)
