# Quick Reference Guide

Fast reference for common tasks and commands in the Maturity Assessment Platform.

## Quick Start Commands

```bash
# Docker (recommended)
docker compose up --build

# Backend (manual)
cd backend
./mvnw spring-boot:run

# Frontend (manual)
cd frontend
yarn dev

# Database
psql -U postgres -d maturity-db
```

## Important URLs

| Service     | URL                          | Description             |
| ----------- | ---------------------------- | ----------------------- |
| Frontend    | http://localhost:3000        | Next.js application     |
| Backend API | http://localhost:8080/api/v1 | REST API base URL       |
| Database    | localhost:5432               | PostgreSQL database     |
| pgAdmin     | http://localhost:5050        | Database admin (Docker) |

## Authentication Flow

```bash
# 1. Register
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "password": "password",
  "name": "John Doe",
  "organizationName": "Acme Corp"
}

# 2. Login (get tokens)
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
# Returns: { "accessToken": "...", "refreshToken": "..." }

# 3. Use access token
GET /api/v1/assessments
Header: Authorization: Bearer <accessToken>

# 4. Refresh when expired
POST /api/v1/auth/refresh
{ "refreshToken": "..." }
```

## Role Hierarchy

```
ADMIN    → Can do everything
CURATOR  → Manage models, domains, view all assessments
CURATOR → Review assessments, view open answers
USER     → Create and view own assessments
```

Higher roles inherit all permissions of lower roles.

## Common API Endpoints

### Authentication

```bash
POST   /api/v1/auth/register          # Register new user
POST   /api/v1/auth/login             # Login (returns tokens)
POST   /api/v1/auth/refresh           # Refresh access token
GET    /api/v1/user/me                # Get current user
```

### Admin (ADMIN only)

```bash
GET    /api/v1/admin/users             # List all users
POST   /api/v1/admin/users             # Create user
PUT    /api/v1/admin/users/{id}        # Update user
DELETE /api/v1/admin/users/{id}        # Delete user
```

### Domains

```bash
GET    /api/v1/domain                  # List domains
GET    /api/v1/domain/with-models      # Domains with models
GET    /api/v1/domain/{id}             # Get domain
POST   /api/v1/domain                  # Create domain (CURATOR+)
DELETE /api/v1/domain/{id}             # Delete domain (CURATOR+)
```

### Maturity Models

```bash
GET    /api/v1/maturity-model              # List all models
GET    /api/v1/maturity-model/{id}         # Get model details
GET    /api/v1/maturity-model/active       # List active models (optional domainId)
POST   /api/v1/maturity-model              # Create model (CURATOR+)
POST   /api/v1/maturity-model/upload       # Upload YAML model (CURATOR+)
PUT    /api/v1/maturity-model/{id}         # Update model (CURATOR+)
PUT    /api/v1/maturity-model/{id}/activate # Activate model (CURATOR+)
DELETE /api/v1/maturity-model/{id}         # Delete model (CURATOR+)
```

### Assessments

```bash
POST   /api/v1/assessments              # Create assessment (multipart)
GET    /api/v1/assessments              # Get user's assessments
GET    /api/v1/assessments/all          # All assessments (CURATOR+)
GET    /api/v1/assessments/{id}         # Get assessment by ID
GET    /api/v1/assessments/pending      # Pending assessments (CURATOR+)
PUT    /api/v1/assessments/{id}/complete # Mark complete (CURATOR+)
GET    /api/v1/assessments/{id}/open-answers # Open answers (CURATOR+)
DELETE /api/v1/assessments/{id}         # Delete assessment
```

### Evidence

```bash
GET    /api/v1/evidence/assessment/{id}                    # Evidence for assessment
GET    /api/v1/evidence/assessment/{id}/question/{qId}     # Evidence by question
GET    /api/v1/evidence/{evidenceId}/download               # Download file
DELETE /api/v1/evidence/{evidenceId}                        # Delete evidence
```

## Project Structure Quick Map

```
backend/src/main/java/.../maturity_assessment/
├── auth/                      # Users, auth, admin, refresh tokens
├── assessments/               # Assessments, evidence, scoring
├── maturity-models/           # Models, domains, dimensions, modules, practices
└── config/                    # Security, JWT, exceptions

frontend/src/
├── app/                       # Pages (Next.js App Router)
│   ├── admin/                 # Admin panel
│   ├── assessment/            # Create assessment
│   ├── assessments/           # View assessments (+ /all)
│   ├── dashboard/             # User dashboard
│   ├── domains/               # Domain management
│   ├── evaluate/              # Evaluate assessments
│   ├── maturity-models/       # Model management
│   └── results/               # Results & analytics
├── api/                       # API client & types
├── components/                # React components
├── context/                   # Auth context
├── hooks/                     # Custom hooks
└── lib/                       # Utilities (CSV export, etc.)
```

## Environment Variables

### Backend (application.properties)

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/maturity-db
spring.datasource.username=postgres
spring.datasource.password=postgres
jwt.access-token.expiration=1800000
jwt.refresh-token.expiration=2592000000
```

### Frontend (.env)

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_TOKEN=auth_token
NEXT_PUBLIC_REFRESH_TOKEN=refresh_token
```

## Question Types

| Type                    | Answer Format    | Scoring           |
| ----------------------- | ---------------- | ----------------- |
| `boolean`               | true/false       | configured correct answer → 1; other → 0 |
| `likert`                | configured point | direction-aware normalization to 0–1 |
| `open_answer`           | free text + evaluator level | evaluator level 1–N normalized to 0–1 |
| `numeric`               | bounded integer  | direction-aware normalization to 0–1 |
| `percentage`            | bounded integer  | direction-aware normalization to 0–1 |
| `evidence`              | file upload      | based on upload   |
| `boolean_justification` | true/false + text | true=5, false=1  |

## Database Tables

| Table             | Purpose                        |
| ----------------- | ------------------------------ |
| users             | User accounts                  |
| refresh_tokens    | JWT refresh tokens             |
| domains           | Model domain categories        |
| maturity_models   | Maturity model definitions     |
| maturity_levels   | Maturity level scale           |
| dimensions        | Assessment dimensions          |
| modules           | Modules within dimensions      |
| practices         | Practices within modules       |
| questions         | Assessment questions           |
| assessments       | Completed assessments          |
| dimension_results | Per-dimension results          |
| evidence          | Uploaded evidence files        |

## Tech Stack Reference

### Backend

- **Java 21** - Programming language
- **Spring Boot 3.4.4** - Framework
- **PostgreSQL 16** - Database
- **Maven** - Build tool
- **Lombok** - Boilerplate reduction
- **JWT (JJWT 0.11.5)** - Authentication

### Frontend

- **Next.js 14** - React framework
- **TypeScript 5.8** - Language
- **Tailwind CSS** - Styling
- **shadcn/ui (Radix UI)** - Component library
- **Axios** - HTTP client
- **Recharts** - Charts and visualization
- **Framer Motion** - Animations
- **React Hook Form** - Form handling
- **Zod** - Validation

## Troubleshooting Commands

### Kill Processes on Ports

```bash
lsof -ti:8080 | xargs kill -9  # Backend
lsof -ti:3000 | xargs kill -9  # Frontend
```

### Clean and Rebuild

```bash
# Backend
./mvnw clean install -U

# Frontend
rm -rf node_modules .next && yarn install
```

### Docker Reset

```bash
docker compose down -v
docker compose up --build
```

## Where to Look

| Issue           | Look Here                                        |
| --------------- | ------------------------------------------------ |
| Setup problems  | [GETTING_STARTED.md](./GETTING_STARTED.md)       |
| API questions   | [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)   |
| Database schema | [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)       |
| Architecture    | [ARCHITECTURE.md](./ARCHITECTURE.md)             |
| Code patterns   | Backend/Frontend Development Guides              |
| Workflows       | [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) |
| YAML models     | [YAML_MODEL_GUIDE.md](./YAML_MODEL_GUIDE.md)    |
