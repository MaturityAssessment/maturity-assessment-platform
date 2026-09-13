# Maturity Assessment Platform

A comprehensive web-based platform for conducting organizational maturity assessments using customizable maturity models.

## Quick Start

Local development runs PostgreSQL, the backend, and the frontend directly on
the workstation. Docker Compose is reserved for the online VM deployment.

Follow the **[Getting Started Guide](./GETTING_STARTED.md)** for the complete
database creation, environment-template, backend, frontend, first-admin, and
optional campaign-email setup. The application is served locally at
`http://localhost:3000/filipevm`.

## Documentation

### Getting Started

- **[Getting Started Guide](./GETTING_STARTED.md)** - Complete setup instructions for development environment
- **[Project Overview](./PROJECT_OVERVIEW.md)** - High-level overview of the platform and its features

### Architecture & Design

- **[Architecture](./ARCHITECTURE.md)** - System architecture, component design, and technical decisions
- **[Database Schema](./DATABASE_SCHEMA.md)** - Complete database structure and relationships
- **[API Documentation](./API_DOCUMENTATION.md)** - REST API reference with all endpoints

### Development Guides

- **[Development Workflow](./DEVELOPMENT_WORKFLOW.md)** - Common development tasks and workflows
- **[Backend Development Guide](./backend/DEVELOPMENT_GUIDE.md)** - Java/Spring Boot best practices and patterns
- **[Frontend Development Guide](./frontend/DEVELOPMENT_GUIDE.md)** - React/Next.js best practices and patterns
- **[Frontend README](./frontend/README.md)** - Frontend-specific setup and configuration
- **[Backend README](./backend/README.md)** - Backend-specific setup and configuration

### Model Creation

- **[Quick Reference](./QUICK_REFERENCE.md)** - Quick reference and cheat sheet

## Technology Stack

### Backend

- Java 21
- Spring Boot 3.4.4
- Spring Security + JWT (access + refresh tokens)
- PostgreSQL
- Hibernate/JPA
- Maven

### Frontend

- Next.js 14 (App Router)
- React 18
- TypeScript 5.8
- Tailwind CSS
- shadcn/ui (Radix UI)
- Axios
- Recharts
- Framer Motion

## Features

- User authentication with JWT (access + refresh tokens)
- Hierarchical role-based access control (USER, CURATOR, ADMIN)
- Domain management for organizing maturity models
- Custom maturity model creation (API, UI, or YAML upload)
- Configurable dimensions, modules, practices, and questions
- Multiple question types (boolean, likert, open answer, numeric, percentage, evidence, boolean justification)
- Question dependencies and evidence upload support
- Assessment creation and evaluation workflow
- Automatic scoring and maturity level calculation
- Results visualization per dimension with charts
- CSV export of assessment results
- Historical assessment tracking
- Admin panel for user management
- Docker-based deployment

## Project Structure

```
maturity-assessment-platform/
├── backend/                # Spring Boot REST API
│   ├── src/main/java/
│   │   └── com/master_thesis/maturity_assessment/
│   │       ├── auth/              # Authentication, users & admin
│   │       ├── assessments/       # Assessment & evidence management
│   │       ├── maturity-models/   # Model, domain & scoring management
│   │       └── config/            # Security, JWT & configuration
│   └── src/main/resources/
│       └── application.properties
│
├── frontend/               # Next.js frontend application
│   ├── src/
│   │   ├── app/           # Pages (App Router)
│   │   ├── api/           # API client & types
│   │   ├── components/    # React components
│   │   ├── context/       # Global state management
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
│   └── public/
│       └── templates/     # XLSX model templates
│
├── docker-compose.yml      # Online VM deployment
├── Dockerfile.backend      # Backend Docker image
├── Dockerfile.frontend     # Frontend Docker image
└── [Documentation Files]   # This README and related docs
```

## Security

- JWT-based authentication with access tokens (30 min) and refresh tokens (30 days)
- Token rotation on refresh (old refresh token revoked)
- BCrypt password hashing
- Hierarchical role-based authorization (ADMIN > CURATOR > USER)
- CORS configuration for frontend
- Stateless session management

## Database

**PostgreSQL Database:**

- Database name: `maturity-db`
- Default user: `postgres`
- Default port: `5432`

**Main Tables:**

- `users` - User accounts
- `refresh_tokens` - JWT refresh tokens
- `domains` - Domain categories for maturity models
- `maturity_models` - Maturity model definitions
- `maturity_levels` - Maturity level scale
- `dimensions` - Assessment dimensions
- `modules` - Modules within dimensions
- `practices` - Practices within modules
- `questions` - Assessment questions within practices
- `assessments` - Completed assessments
- `dimension_results` - Per-dimension results
- `evidence` - Uploaded evidence files

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for complete schema documentation.

## API Overview

**Base URL:** `http://localhost:8080/api/v1`

**Main Endpoints:**

- `/auth/register` - User registration
- `/auth/login` - User login (returns access + refresh tokens)
- `/auth/refresh` - Refresh access token
- `/admin/users` - User management (ADMIN only)
- `/domain` - Domain management
- `/maturity-model` - Maturity model management
- `/assessments` - Assessment creation and retrieval
- `/evidence` - Evidence file management
- `/user/me` - Current user information

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

## Docker deployment

Docker is used for the online VM, not as the supported local development
workflow. Configure the VM's ignored environment files from the committed
templates before deploying:

```bash
docker compose up --build -d
```

## Testing

### Backend Tests

```bash
cd backend
./mvnw test
```

### Frontend Tests

```bash
cd frontend
yarn test
```

## Building for Production

### Backend

```bash
cd backend
./mvnw clean package
java -jar target/maturity_assessment-0.0.1-SNAPSHOT.jar
```

### Frontend

```bash
cd frontend
yarn build
yarn start
```

## Environment Variables

### Backend

Copy `backend/.env.template` to the ignored `backend/.env`. At minimum configure
the database connection and a randomly generated `JWT_SECRET`. The same template
contains disabled SMTP and assistant integration settings.

### Frontend

Copy `frontend/.env.template` to the ignored `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_TOKEN=auth_token
NEXT_PUBLIC_REFRESH_TOKEN=refresh_token
```

## Development Checklist

Before starting development, ensure:

- [ ] Java 21 JDK installed
- [ ] PostgreSQL installed and running
- [ ] Node.js 22.6+ installed
- [ ] Yarn package manager installed (Corepack)
- [ ] Database `maturity-db` created
- [ ] Backend starts successfully on port 8080
- [ ] Frontend starts successfully on port 3000

## Troubleshooting

### Backend won't start

- Check PostgreSQL is running: `pg_isready`
- Verify the configured database login with `psql`
- Check port 8080 is available: `lsof -ti:8080`

### Frontend won't start

- Check port 3000 is available: `lsof -ti:3000`
- Verify environment variables in `.env.local`

### Database connection errors

- Check credentials in `backend/.env`
- Verify PostgreSQL is accepting connections
- Ensure database exists

### CORS errors

- Verify backend allows frontend origin in CORS config
- Check frontend is sending requests to correct API URL

## Additional Resources

### External Documentation

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [React Documentation](https://react.dev/)

### Internal Documentation

| Document                                                         | Description                        |
| ---------------------------------------------------------------- | ---------------------------------- |
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)                     | System overview and architecture   |
| [GETTING_STARTED.md](./GETTING_STARTED.md)                       | Setup and installation guide       |
| [ARCHITECTURE.md](./ARCHITECTURE.md)                             | Technical architecture details     |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)                   | Complete API reference             |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)                       | Database structure and queries     |
| [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)             | Development workflows              |
| [YAML_MODEL_GUIDE.md](./YAML_MODEL_GUIDE.md)                     | Creating maturity models with YAML |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)                       | Quick reference and cheat sheet    |
| [backend/README.md](./backend/README.md)                         | Backend-specific guide             |
| [backend/DEVELOPMENT_GUIDE.md](./backend/DEVELOPMENT_GUIDE.md)   | Backend best practices             |
| [frontend/README.md](./frontend/README.md)                       | Frontend-specific guide            |
| [frontend/DEVELOPMENT_GUIDE.md](./frontend/DEVELOPMENT_GUIDE.md) | Frontend best practices            |

## Contributing

When contributing to this project:

1. Read the [Development Workflow](./DEVELOPMENT_WORKFLOW.md)
2. Follow coding standards in development guides
3. Create feature branches from `main`
4. Write tests for new features
5. Update documentation as needed
6. Submit pull requests for review

## License

This project is developed as part of a Master's Thesis.

## Author

Master's Thesis Project - Organizational Maturity Assessment Platform

---

**Quick Navigation:**

- [Getting Started](./GETTING_STARTED.md) - Setup instructions
- [Quick Reference](./QUICK_REFERENCE.md) - Cheat sheet
- [API Docs](./API_DOCUMENTATION.md) - API reference
- [Architecture](./ARCHITECTURE.md) - System design
- [Workflows](./DEVELOPMENT_WORKFLOW.md) - Development guide
- [YAML Models](./YAML_MODEL_GUIDE.md) - Creating maturity models
- [Backend Guide](./backend/DEVELOPMENT_GUIDE.md) - Backend patterns
- [Frontend Guide](./frontend/DEVELOPMENT_GUIDE.md) - Frontend patterns

For any issues or questions, refer to the comprehensive documentation above.
