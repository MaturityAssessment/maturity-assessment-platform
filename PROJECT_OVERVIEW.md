# Maturity Assessment Platform - Project Overview

The Maturity Assessment Platform is a web application for defining maturity models, collecting organizational assessments, and reviewing their results. It is developed as part of a Master's Thesis project.

This document introduces the platform, its users, and its technical structure. The companion [Core Features](./CORE_FEATURES.md) document describes the current capabilities and user workflows.

## Table of Contents

- [Purpose](#purpose)
- [Target Users](#target-users)
- [Core Features](#core-features)
- [Assessment Lifecycle](#assessment-lifecycle)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Data Model Overview](#data-model-overview)
- [Security and Access](#security-and-access)
- [Related Documentation](#related-documentation)

## Purpose

Organizations can define what maturity means within a domain, such as Software Engineering or Cybersecurity, and assess practices against that model. Configurable questionnaires, supporting evidence, and evaluator review connect reported practices to maturity results.

The platform supports individual assessments and invitation-based campaigns. Each assessment stays associated with the exact model version used to start it, preserving the context of its questions and results as models evolve.

## Target Users

| User | Main responsibilities |
| --- | --- |
| Registered user (`USER`) | Complete individual assessments, view results, and create and manage their own campaigns after account approval. |
| Curator (`CURATOR`) | Manage domains and models; evaluate submissions and request corrections, in addition to user capabilities. |
| Administrator (`ADMIN`) | Approve and manage accounts, with all curator and user capabilities. |
| Campaign participant | Respond through an invitation link without needing a platform account. |

Evaluator is a responsibility performed by curators and administrators, rather than a separate application role. Campaign ownership gives access to campaign management; reviewing submissions requires curator/admin permissions.

## Core Features

The [Core Features](./CORE_FEATURES.md) document covers:

- Account registration, approval, and role-based access.
- Domain organization and versioned maturity-model authoring with Excel import/export.
- Configurable questions, dependencies, evidence requirements, and scoring.
- Saved assessment drafts, submission, evaluator review, and respondent corrections.
- Campaign invitations, participant progress, and aggregate results.
- Assessment results, PDF/Excel reports, and optional assistant integrations.

## Assessment Lifecycle

1. A curator creates a model in a domain and activates a version.
2. A user starts an assessment, or a campaign participant opens an invitation tied to that version.
3. The respondent completes the questionnaire and saves answers and evidence in a draft.
4. Submission completes an automatically evaluated assessment or sends a manually evaluated assessment for review.
5. A curator reviews the submission, requests corrections when needed, and finishes the evaluation.
6. Completed results are available for viewing and reporting.

See [assessment execution](./CORE_FEATURES.md#assessment-execution), [evaluation and corrections](./CORE_FEATURES.md#evaluation-and-corrections), and the [API assessment workflow](./backend/docs/api/workflows/assessments.md) for details.

## System Architecture

The application uses three main tiers:

```text
Browser
  │
  ▼
Frontend: Next.js / React                 localhost:3000/filipevm
  │ REST API, authenticated requests or campaign invitation token
  ▼
Backend: Spring Boot / Spring Security    localhost:8080/api/v1
  ├── JPA / Hibernate ──► PostgreSQL       localhost:5432
  ├── Evidence files ──► Configured filesystem storage
  └── Optional services: campaign email and AI assistance
```

Local development runs PostgreSQL, the backend, and the frontend directly on the workstation. Docker Compose supports deployment on the online VM. Evidence files need persistent storage alongside the database.

The [Architecture](./ARCHITECTURE.md) document provides technical detail; [Getting Started](./GETTING_STARTED.md) owns environment configuration and deployment instructions.

## Technology Stack

| Area | Main technologies |
| --- | --- |
| Backend | Java 21, Spring Boot 3.4.4, Maven, Spring Security, JWT, JPA/Hibernate |
| Frontend | Next.js 14, React 18, TypeScript, Yarn |
| Interface | Tailwind CSS, shadcn/ui and Radix components, Recharts, Framer Motion |
| Forms and API access | React Hook Form, Zod, Axios, React Context |
| Persistence | PostgreSQL, Flyway migrations, filesystem evidence storage |
| Import and reporting | Apache POI for model workbooks; XLSX and React PDF for assessment exports |
| Deployment | Docker Compose with separate frontend and backend images |

Dependency versions are maintained in [backend/pom.xml](./backend/pom.xml) and [frontend/package.json](./frontend/package.json). Database startup currently uses Hibernate schema updates, with Flyway enabled through configuration; follow the setup guide for migration settings.

## Project Structure

```text
maturity-assessment-platform/
├── PROJECT_OVERVIEW.md          # Purpose, users, architecture, and navigation
├── CORE_FEATURES.md             # Capabilities and user workflows
├── README.md                   # Repository entry point and documentation directory
├── backend/
│   ├── docs/api/               # API contracts and integration workflows
│   └── src/main/
│       ├── java/com/master_thesis/maturity_assessment/
│       │   ├── auth/           # Accounts, authentication, and administration
│       │   ├── maturity_models/ # Domains, models, and scoring configuration
│       │   ├── assessments/    # Drafts, evidence, evaluation, and results
│       │   ├── campaigns/      # Invitations and campaign management
│       │   ├── assistant/      # Assistant integration
│       │   └── config/         # Security and application configuration
│       └── resources/          # Application settings, migrations, and prompts
├── frontend/
│   ├── src/
│   │   ├── app/                # App Router pages and feature components
│   │   ├── api/                # API clients and types
│   │   ├── components/         # Shared interface components
│   │   ├── context/            # React context providers
│   │   ├── hooks/              # Shared hooks
│   │   └── lib/                # Utilities
│   ├── tests/                  # Frontend tests
│   └── public/templates/       # Excel model templates
├── docker-compose.yml          # Online VM deployment
├── Dockerfile.backend
└── Dockerfile.frontend
```

## Data Model Overview

| Entity group | Purpose |
| --- | --- |
| User and RefreshToken | Account identity, role, approval, and refresh-token rotation. |
| Domain | Organizes model lineages by subject area. |
| MaturityModel and MaturityLevel | Store a versioned model and its maturity scale. |
| Dimension, Module, Practice, and Question | Define the questionnaire hierarchy and question configuration. |
| Assessment | Stores responses, lifecycle state, and the reference to an exact model version. |
| Evidence | Stores supporting file or HTTPS-link metadata for assessment questions. |
| QuestionEvaluation | Stores evaluator decisions, scores, and reviewer notes. |
| DimensionResult | Stores dimension-level assessment results. |
| Campaign and CampaignParticipant | Connect an organizer, model version, invitations, and participant assessments. |

The questionnaire hierarchy is **Domain → Model version → Dimension → Module → Practice → Question**. Model versions belong to a lineage; each lineage can have one active version. Multiple lineages may be active within the same domain.

An assessment can belong to a registered user or a campaign participant and has associated evidence, question reviews, and dimension results. See [Database Schema](./DATABASE_SCHEMA.md) for the database reference.

## Security and Access

Registered accounts require administrator approval before login. Authentication uses JWT access tokens and rotating refresh tokens, with BCrypt password hashing. Backend authorization applies the role hierarchy `ADMIN > CURATOR > USER` together with operation-specific ownership checks.

Campaign respondents use invitation tokens for access to their assigned assessment. Campaign deadlines and invitation validity constrain that access. External assistant credentials and mail settings belong to backend configuration.

See [API authentication](./backend/docs/api/authentication.md) for access rules and [Getting Started](./GETTING_STARTED.md) for environment setup.

## Related Documentation

| Document | Use it for |
| --- | --- |
| [Core Features](./CORE_FEATURES.md) | Current capabilities and user workflows. |
| [Getting Started](./GETTING_STARTED.md) | Local setup, configuration, and VM deployment. |
| [Architecture](./ARCHITECTURE.md) | Technical architecture and component design. |
| [API Documentation](./backend/docs/api/README.md) | Endpoint contracts and integration workflows. |
| [Database Schema](./DATABASE_SCHEMA.md) | Tables and relationships. |
| [Development Workflow](./DEVELOPMENT_WORKFLOW.md) | Development and verification practices. |
| [Backend Development Guide](./backend/DEVELOPMENT_GUIDE.md) | Backend implementation guidance. |
| [Frontend Development Guide](./frontend/DEVELOPMENT_GUIDE.md) | Frontend implementation guidance. |
