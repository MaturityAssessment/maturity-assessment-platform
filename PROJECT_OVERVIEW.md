# Maturity Assessment Platform - Project Overview

## Purpose

The Maturity Assessment Platform is a web-based application designed to evaluate organizational maturity across various dimensions. It enables organizations to:

- Create and manage custom maturity models with multiple dimensions, modules, and practices
- Organize models by domain (e.g., Software Engineering, Cybersecurity)
- Conduct assessments using configurable questionnaires with multiple question types
- Upload evidence to support assessment answers
- Track maturity progress across different dimensions
- Generate detailed assessment reports and analytics
- Export results as CSV

This platform is built as part of a Master's Thesis project to provide a flexible, scalable solution for organizational maturity assessment.

## System Architecture

The application follows a **three-tier architecture**:

```
┌─────────────────┐
│   Frontend      │ Next.js 14 + React 18 + TypeScript
│   (Port 3000)   │ Tailwind CSS + shadcn/ui
└────────┬────────┘
         │ REST API (HTTP/HTTPS)
         │ JWT Authentication (Access + Refresh Tokens)
┌────────▼────────┐
│   Backend       │ Spring Boot 3.4.4 + Java 21
│   (Port 8080)   │ Spring Security + JWT
└────────┬────────┘
         │ JPA/Hibernate
┌────────▼────────┐
│   Database      │ PostgreSQL
│   (Port 5432)   │
└─────────────────┘
```

## Project Structure

```
maturity-assessment-platform/
├── backend/                    # Spring Boot backend application
│   ├── src/main/java/
│   │   └── com/master_thesis/maturity_assessment/
│   │       ├── auth/          # Authentication, users & admin
│   │       ├── assessments/   # Assessment & evidence management
│   │       ├── maturity-models/ # Model, domain & scoring management
│   │       └── config/        # Security, JWT, exceptions & configuration
│   └── src/main/resources/
│       └── application.properties
│
├── frontend/                   # Next.js frontend application
│   ├── src/
│   │   ├── app/               # Next.js App Router pages
│   │   ├── api/               # API client & types
│   │   ├── components/        # Reusable React components
│   │   ├── context/           # React Context providers
│   │   ├── hooks/             # Custom React hooks
│   │   └── lib/               # Utility functions
│   └── public/
│       └── templates/         # YAML templates for maturity models
│
├── docker-compose.yml          # Docker for local development
├── docker-compose.vm.yml       # Docker for VM deployment
├── Dockerfile.backend          # Backend Docker image
├── Dockerfile.frontend         # Frontend Docker image
└── [Documentation Files]
```

## Core Features

### 1. User Management & Authentication

- User registration and login
- Hierarchical role-based access control (USER, CURATOR, ADMIN)
- JWT-based authentication with access tokens (30 min) and refresh tokens (30 days)
- Token rotation on refresh for security
- Secure password hashing with BCrypt
- Admin panel for user CRUD operations

### 2. Domain Management

- Organize maturity models into domains (e.g., Software Engineering, Cybersecurity)
- Create, view, and delete domains
- Filter models by domain

### 3. Maturity Model Management

- Create custom maturity models via REST API, UI form, or YAML upload
- Define maturity levels (typically 1-5 scale)
- Hierarchical structure: Model → Dimensions → Modules → Practices → Questions
- Multiple question types: boolean, likert, open answer, numeric, percentage, evidence, boolean justification
- Question dependencies (conditional display)
- Evidence upload requirements per question
- Model versioning with base model tracking
- Auto-evaluated vs. manually evaluated models
- Activate/deactivate model versions (only one active version per model
  lineage; multiple model lineages may be active in a domain)

### 4. Assessment Workflow

- Conduct assessments using a selected active maturity-model version
- Answer questions organized by dimension, module, and practice
- Upload evidence files alongside answers
- Automatic calculation of dimension scores and overall maturity level
- Support for pending assessments and evaluator review
- Track pending and completed assessments

### 5. Results & Analytics

- View detailed assessment results per dimension
- Overall maturity level visualization with charts (Recharts)
- Historical assessment tracking per user
- CSV export of results
- Open answer review for evaluators

## Technology Stack

### Backend

- **Framework**: Spring Boot 3.4.4
- **Language**: Java 21
- **ORM**: Hibernate/JPA
- **Security**: Spring Security + JWT (JJWT 0.11.5)
- **Database**: PostgreSQL
- **Build Tool**: Maven
- **Additional Libraries**:
  - Lombok (for boilerplate reduction)
  - SnakeYAML (for YAML parsing)
  - Jackson (for JSON/YAML processing)

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.8
- **UI Library**: React 18
- **Styling**: Tailwind CSS 3.4
- **Component Library**: shadcn/ui (Radix UI)
- **HTTP Client**: Axios 1.7
- **Charts**: Recharts 2.15
- **Animations**: Framer Motion 12
- **State Management**: React Context API
- **Form Handling**: React Hook Form 7.62
- **Validation**: Zod 3.23
- **Date Handling**: date-fns 3.6
- **Package Manager**: Yarn 4.5

### Database

- **DBMS**: PostgreSQL 16
- **Schema Management**: Hibernate DDL Auto-update
- **Connection**: JDBC

## Security Features

1. **Authentication**: JWT access tokens (30 min) + refresh tokens (30 days) with rotation
2. **Password Security**: BCrypt hashing
3. **CORS Configuration**: Configurable per environment
4. **Stateless Sessions**: No server-side session storage
5. **Protected Endpoints**: Role-based access per endpoint
6. **Hierarchical Roles**: ADMIN > CURATOR > USER

## Key Workflows

### Creating a Maturity Model

1. Admin/Curator creates a domain (optional)
2. Creates maturity model via API, UI form, or YAML upload
3. Defines maturity levels (e.g., 1-5)
4. Creates dimensions with modules, practices, and questions
5. Activates the model for use in assessments

### Conducting an Assessment

1. User logs in and navigates to assessment page
2. User selects an active maturity model and the system loads that exact version
3. User answers questions for each dimension/module/practice
4. User optionally uploads evidence files
5. System calculates dimension scores and overall maturity level
6. Assessment is saved with results

### Viewing Results

1. User navigates to results page
2. System displays all past assessments with charts
3. User can view detailed breakdown by dimension
4. Results can be exported as CSV

## Data Model Overview

### Core Entities

- **User**: System users with hierarchical roles
- **RefreshToken**: JWT refresh tokens for token rotation
- **Domain**: Categories for organizing maturity models
- **MaturityModel**: Container for dimensions and levels, linked to a domain
- **MaturityLevel**: Defines maturity scale (typically 1-5)
- **Dimension**: Assessment categories (e.g., Process, Quality)
- **Module**: Sub-categories within dimensions
- **Practice**: Grouped activities within modules
- **Question**: Individual questions within practices
- **Assessment**: Completed evaluations with scores
- **DimensionResult**: Per-dimension scores for an assessment
- **Evidence**: Uploaded files supporting assessment answers

### Relationships

- Domain → MaturityModel (One-to-Many)
- MaturityModel → MaturityLevel (One-to-Many)
- MaturityModel → Dimension (One-to-Many)
- Dimension → Module (One-to-Many)
- Module → Practice (One-to-Many)
- Practice → Question (One-to-Many)
- User → Assessment (One-to-Many)
- User → RefreshToken (One-to-Many)
- Assessment → DimensionResult (One-to-Many)
- Assessment → Evidence (One-to-Many)

## Target Users

- **Users**: Conduct maturity assessments for their organizations
- **Evaluators**: Review and validate assessment results, view open answers
- **Curators**: Manage maturity models and domains
- **Administrators**: Full system access including user management

## Related Documentation

- [Architecture Details](./ARCHITECTURE.md)
- [Getting Started Guide](./GETTING_STARTED.md)
- [API Documentation](./backend/docs/api/README.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Backend Development Guide](./backend/DEVELOPMENT_GUIDE.md)
- [Frontend Development Guide](./frontend/DEVELOPMENT_GUIDE.md)
