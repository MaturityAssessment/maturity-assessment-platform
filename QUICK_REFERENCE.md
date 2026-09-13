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

## API quick reference

Use the [backend API endpoint index](./backend/docs/api/README.md#endpoint-index)
for the complete current route list and links to request/response contracts.

- [First request and login example](./backend/docs/api/getting-started.md)
- [Registration approval, tokens, and permissions](./backend/docs/api/authentication.md)
- [Assessment workflow](./backend/docs/api/workflows/assessments.md)
- [Campaign workflow](./backend/docs/api/workflows/campaigns.md)
- [Model management workflow](./backend/docs/api/workflows/model-management.md)
- [Updating the documentation](./backend/docs/api/maintaining.md)

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

See the [question-type contract](./backend/docs/api/reference/maturity-models.md#question-types)
for supported types, authoring settings, and respondent values, and the
[review request contract](./backend/docs/api/reference/assessments.md#review-request)
for manual score rules.

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
| API questions   | [API documentation](./backend/docs/api/README.md)   |
| Database schema | [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)       |
| Architecture    | [ARCHITECTURE.md](./ARCHITECTURE.md)             |
| Code patterns   | Backend/Frontend Development Guides              |
| Workflows       | [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) |
| YAML models     | [YAML_MODEL_GUIDE.md](./YAML_MODEL_GUIDE.md)    |
