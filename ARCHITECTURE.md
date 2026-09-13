# System Architecture

## Overview

The Maturity Assessment Platform is built using a modern three-tier architecture with clear separation between presentation, business logic, and data layers.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
│                     (Next.js 14 + React 18)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │    Pages     │  │  Components  │  │   Context    │           │
│  │  (App Router)│  │    (UI)      │  │  (Auth/State)│           │
│  └──────┬───────┘  └───────┬──────┘  └──────┬───────┘           │
│         │                  │                │                   │
│         └──────────────────┼────────────────┘                   │
│                            │                                    │
│                   ┌────────▼────────┐                           │
│                   │   API Client    │                           │
│                   │    (Axios)      │                           │
│                   └────────┬────────┘                           │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             │ HTTP/REST (JSON + Multipart)
                             │ JWT Bearer Token (Access + Refresh)
                             │
┌────────────────────────────▼──────────────────────────────────┐
│                        BACKEND LAYER                          │
│                   (Spring Boot 3.4.4 + Java 21)               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Controllers  │  │   Services   │  │ Repositories │         │
│  │  (REST API)  │──│   (Business  │──│    (JPA)     │         │
│  └──────┬───────┘  │    Logic)    │  └──────┬───────┘         │
│         │          └──────────────┘         │                 │
│  ┌──────▼─────────────────────────┐         │                 │
│  │     Security Layer             │         │                 │
│  │  - JWT Auth Filter (Access)    │         │                 │
│  │  - Refresh Token Service       │         │                 │
│  │  - Role Hierarchy              │         │                 │
│  │  - CORS Configuration          │         │                 │
│  └────────────────────────────────┘         │                 │
│                                             │                 │
│  ┌──────────────────────────────────┐       │                 │
│  │  File Storage (Evidence)         │       │                 │
│  └──────────────────────────────────┘       │                 │
│                                             │                 │
└─────────────────────────────────────────────┼─────────────────┘
                                              │
                                              │ JDBC
                                              │
┌─────────────────────────────────────────────▼───────────────────┐
│                        DATA LAYER                               │
│                       (PostgreSQL 16)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Tables: users, refresh_tokens, domains, maturity_models,      │
│           maturity_levels, dimensions, modules, practices,      │
│           questions, assessments, dimension_results, evidence   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Architecture (Next.js)

```
frontend/
├── app/                       # Next.js App Router
│   ├── layout.tsx             # Root layout with AuthProvider
│   ├── page.tsx               # Landing page
│   ├── login/                 # Authentication pages
│   ├── register/
│   ├── dashboard/             # User dashboard
│   ├── admin/                 # Admin panel (user management)
│   ├── domains/               # Domain management
│   ├── maturity-models/       # Model management (list + detail)
│   ├── assessment/            # Assessment creation
│   ├── assessments/           # Assessment list (+ /all for admins)
│   ├── evaluate/              # Assessment evaluation
│   └── results/               # Results viewing & export
│
├── api/
│   ├── axios.ts               # HTTP client with interceptors
│   └── types.ts               # TypeScript type definitions
│
├── components/                # Reusable UI components
│   ├── ui/                    # shadcn/ui components
│   ├── TopNavbar.tsx             # Navigation bar
│   ├── Button.tsx             # Custom button
│   └── EvidenceUpload.tsx     # Evidence file upload
│
├── context/
│   └── AuthContext.tsx        # Global auth state (tokens, user)
│
├── hooks/
│   └── useAuth.ts             # Authentication hook
│
└── lib/
    └── utils.ts               # Utilities (cn, CSV export)
```

### Backend Architecture (Spring Boot)

```
backend/src/main/java/.../maturity_assessment/
│
├── auth/                      # Authentication & Authorization
│   ├── controllers/
│   │   ├── AuthenticationController.java    # Login/Register/Refresh
│   │   ├── AdminController.java            # User CRUD (ADMIN only)
│   │   └── UserController.java             # Current user info
│   ├── models/
│   │   ├── User.java                       # User entity (with role hierarchy)
│   │   ├── UserRole.java                   # Role enum (USER/CURATOR/ADMIN)
│   │   └── RefreshToken.java              # Refresh token entity
│   ├── dto/
│   │   ├── AuthenticationRequest.java
│   │   ├── AuthenticationResponse.java     # { accessToken, refreshToken }
│   │   ├── RefreshTokenRequest.java
│   │   ├── CreateUserRequest.java
│   │   ├── UpdateUserRequest.java
│   │   └── UserDTO.java
│   ├── repository/
│   │   ├── UserRepository.java
│   │   └── RefreshTokenRepository.java
│   └── services/
│       └── RefreshTokenService.java
│
├── maturity-models/           # Maturity Model Management
│   ├── controllers/
│   │   ├── MaturityModelController.java
│   │   └── DomainController.java
│   ├── services/
│   │   ├── MaturityModelService.java       # Model CRUD
│   │   ├── MaturityScoringService.java     # Score calculation
│   │   ├── DomainService.java              # Domain CRUD
│   │   └── CsvParsingService.java          # CSV import
│   ├── models/
│   │   ├── MaturityModel.java              # versioned, domain-linked
│   │   ├── MaturityLevel.java
│   │   ├── Dimension.java
│   │   ├── Module.java                     # Modules within dimensions
│   │   ├── Practice.java                   # Practices within modules
│   │   ├── Question.java                   # Questions within practices
│   │   └── Domain.java                     # Domain categories
│   ├── dto/ [Various DTOs]
│   └── repository/
│       ├── MaturityModelRepository.java
│       ├── DomainRepository.java
│       └── QuestionRepository.java
│
├── assessments/               # Assessment Management
│   ├── controllers/
│   │   ├── AssessmentController.java       # multipart/form-data
│   │   └── EvidenceController.java         # Evidence file management
│   ├── services/
│   │   ├── AssessmentService.java
│   │   ├── EvidenceService.java
│   │   └── FileStorageService.java
│   ├── models/
│   │   ├── Assessment.java
│   │   ├── DimensionResult.java
│   │   └── Evidence.java
│   ├── dto/
│   │   ├── AssessmentRequest.java
│   │   ├── AssessmentResponse.java
│   │   ├── DimensionResultResponse.java
│   │   └── EvidenceDTO.java
│   └── repository/
│       ├── AssessmentRepository.java
│       ├── DimensionResultRepository.java
│       └── EvidenceRepository.java
│
└── config/                    # Configuration
    ├── SecurityConfig.java              # Security, CORS & role-based access
    ├── JwtAuthFilter.java              # JWT validation filter
    ├── JwtUtils.java                   # JWT generation/validation
    ├── UserDetailsConfig.java          # UserDetails service
    ├── DataInitializer.java            # Schema migrations
    ├── GlobalExceptionHandler.java     # Global error handling
    ├── ErrorResponse.java
    ├── ResourceNotFoundException.java
    ├── AuthorizationException.java
    └── IllegalOperationException.java
```

## Security Architecture

### JWT Authentication Flow

```
1. Login Request
   Frontend → POST /api/v1/auth/login {email, password}
       → AuthController validates credentials
       → JwtUtils generates access token (30 min)
       → RefreshTokenService creates refresh token (30 days)
       → Returns { accessToken, refreshToken }
       → Frontend stores both in localStorage

2. Authenticated Request
   Frontend → GET /api/v1/assessments
       + Header: Authorization: Bearer <accessToken>
       → JwtAuthFilter extracts & validates token
       → SecurityContext set with user + role hierarchy
       → Controller processes request

3. Token Refresh
   Frontend → POST /api/v1/auth/refresh { refreshToken }
       → RefreshTokenService validates token
       → Old refresh token revoked (rotation)
       → New access + refresh tokens generated
       → Frontend updates stored tokens
```

### Role Hierarchy

```
ADMIN    = ROLE_ADMIN + ROLE_CURATOR + ROLE_USER
CURATOR  = ROLE_CURATOR + ROLE_USER
USER     = ROLE_USER
USER     = ROLE_USER
```

### Protected Endpoints

- `/api/v1/auth/**` - Public (login/register/refresh)
- `GET /api/v1/maturity-model/**` - Public (read-only)
- `GET /api/v1/domain/**` - Public (read-only)
- `POST/PUT/DELETE /api/v1/maturity-model/**` - CURATOR or ADMIN
- `POST/DELETE /api/v1/domain/**` - CURATOR or ADMIN
- `/api/v1/admin/**` - ADMIN only
- `/api/v1/assessments/pending`, `*/complete`, `*/open-answers` - CURATOR+
- All other `/api/v1/**` - Authenticated

## Data Model Architecture

### Entity Relationships

```
┌─────────────┐
│   Domain    │
└──────┬──────┘
       │ 1
       │ *
┌──────▼────────────┐     ┌─────────────┐
│  MaturityModel    │     │    User     │
└──┬─────┬──────────┘     └──┬──────┬───┘
   │ 1   │ 1                 │ 1   │ 1
   │ *   │ *                 │ *   │ *
┌──▼──┐ ┌▼─────────┐  ┌────▼───┐ ┌▼────────┐
│Level│ │Dimension │  │Refresh │ │Assessment│
└─────┘ └──────┬───┘  │Token   │ └──┬───┬───┘
               │ 1     └────────┘    │ 1 │ 1
               │ *                   │ * │ *
        ┌──────▼───┐          ┌─────▼─┐ ┌▼────────┐
        │ Module   │          │Dim.   │ │Evidence │
        └──────┬───┘          │Result │ └─────────┘
               │ 1             └───────┘
               │ *
        ┌──────▼────┐
        │ Practice  │
        └──────┬────┘
               │ 1
               │ *
        ┌──────▼────┐
        │ Question  │
        └───────────┘
```

## Deployment Architecture

### Docker Deployment

```
┌──────────────────────────────────────────────────────┐
│                docker-compose.yml                    │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │  Frontend   │  │   Backend   │  │  PostgreSQL  │  │
│  │  :3000      │→ │   :8080     │→ │   :5432      │  │
│  │ (Next.js)   │  │(Spring Boot)│  │  (postgres)  │  │
│  └─────────────┘  └─────────────┘  └──────────────┘  │
│                                                      │
│  ┌─────────────┐                                     │
│  │  pgAdmin    │                                     │
│  │  :5050      │                                     │
│  └─────────────┘                                     │
└──────────────────────────────────────────────────────┘
```

### Development Environment (Manual)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │    Backend      │     │   Database      │
│  localhost:3000 │────→│ localhost:8080  │────→│ localhost:5432  │
│   (Next.js)     │     │  (Spring Boot)  │     │  (PostgreSQL)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Design Patterns Used

### Backend Patterns

1. **MVC**: Controllers → Services → Repositories
2. **Repository Pattern**: JPA repositories for data access
3. **DTO Pattern**: Separate API contracts from domain models
4. **Dependency Injection**: Constructor injection with Lombok
5. **Filter Chain**: JWT authentication + security filter chain
6. **Global Exception Handler**: Centralized error handling
7. **Token Rotation**: Refresh token security pattern

### Frontend Patterns

1. **Component-Based Architecture**: Reusable React components
2. **Context API**: Global authentication state
3. **Custom Hooks**: `useAuth` for authentication logic
4. **Interceptor Pattern**: Axios interceptors for JWT and error handling
5. **File-based Routing**: Next.js App Router
