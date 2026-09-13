# Backend - Maturity Assessment Platform

## Overview

This is the backend REST API for the Maturity Assessment Platform, built with Spring Boot 3.4.4 and Java 21.

## Technology Stack

- **Framework**: Spring Boot 3.4.4
- **Language**: Java 21
- **Build Tool**: Maven
- **ORM**: Hibernate/JPA
- **Database**: PostgreSQL
- **Security**: Spring Security + JWT (JJWT 0.11.5)
- **Additional Libraries**:
  - Lombok (boilerplate reduction)
  - Jackson (JSON processing)

## Project Structure

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/master_thesis/maturity_assessment/
│   │   │   ├── auth/                       # Authentication & User Management
│   │   │   │   ├── controllers/
│   │   │   │   │   ├── AuthenticationController.java  # Login/Register/Refresh
│   │   │   │   │   ├── AdminController.java           # User CRUD (ADMIN)
│   │   │   │   │   └── UserController.java            # Current user info
│   │   │   │   ├── dto/
│   │   │   │   │   ├── AuthenticationRequest.java
│   │   │   │   │   ├── AuthenticationResponse.java
│   │   │   │   │   ├── RefreshTokenRequest.java
│   │   │   │   │   ├── CreateUserRequest.java
│   │   │   │   │   ├── UpdateUserRequest.java
│   │   │   │   │   └── UserDTO.java
│   │   │   │   ├── models/
│   │   │   │   │   ├── User.java
│   │   │   │   │   ├── UserRole.java
│   │   │   │   │   └── RefreshToken.java
│   │   │   │   ├── repository/
│   │   │   │   │   ├── UserRepository.java
│   │   │   │   │   └── RefreshTokenRepository.java
│   │   │   │   ├── services/
│   │   │   │   │   └── RefreshTokenService.java
│   │   │   │   └── utils/
│   │   │   │       └── RoleUtils.java
│   │   │   │
│   │   │   ├── assessments/               # Assessment & Evidence Management
│   │   │   │   ├── controllers/
│   │   │   │   │   ├── AssessmentController.java
│   │   │   │   │   └── EvidenceController.java
│   │   │   │   ├── dto/
│   │   │   │   │   ├── AssessmentRequest.java
│   │   │   │   │   ├── AssessmentResponse.java
│   │   │   │   │   ├── DimensionResultResponse.java
│   │   │   │   │   └── EvidenceDTO.java
│   │   │   │   ├── models/
│   │   │   │   │   ├── Assessment.java
│   │   │   │   │   ├── DimensionResult.java
│   │   │   │   │   └── Evidence.java
│   │   │   │   ├── repository/
│   │   │   │   │   ├── AssessmentRepository.java
│   │   │   │   │   ├── DimensionResultRepository.java
│   │   │   │   │   └── EvidenceRepository.java
│   │   │   │   └── services/
│   │   │   │       ├── AssessmentService.java
│   │   │   │       ├── EvidenceService.java
│   │   │   │       └── FileStorageService.java
│   │   │   │
│   │   │   ├── maturity-models/           # Model, Domain & Scoring Management
│   │   │   │   ├── controllers/
│   │   │   │   │   ├── MaturityModelController.java
│   │   │   │   │   └── DomainController.java
│   │   │   │   ├── dto/
│   │   │   │   │   ├── MaturityModelDTO.java
│   │   │   │   │   ├── MaturityModelSummaryDTO.java
│   │   │   │   │   ├── MaturityLevelDTO.java
│   │   │   │   │   ├── DimensionDTO.java
│   │   │   │   │   ├── ModuleDTO.java
│   │   │   │   │   ├── PracticeDTO.java
│   │   │   │   │   ├── QuestionDTO.java
│   │   │   │   │   ├── DomainDTO.java
│   │   │   │   │   ├── CreateDomainRequest.java
│   │   │   │   │   ├── CsvMaturityModelRow.java
│   │   │   │   │   └── CsvUploadResponse.java
│   │   │   │   ├── models/
│   │   │   │   │   ├── MaturityModel.java
│   │   │   │   │   ├── MaturityLevel.java
│   │   │   │   │   ├── Dimension.java
│   │   │   │   │   ├── Module.java
│   │   │   │   │   ├── Practice.java
│   │   │   │   │   ├── Question.java
│   │   │   │   │   └── Domain.java
│   │   │   │   ├── repository/
│   │   │   │   │   ├── MaturityModelRepository.java
│   │   │   │   │   ├── DomainRepository.java
│   │   │   │   │   └── QuestionRepository.java
│   │   │   │   └── services/
│   │   │   │       ├── MaturityModelService.java
│   │   │   │       ├── MaturityScoringService.java
│   │   │   │       ├── DomainService.java
│   │   │   │       └── CsvParsingService.java
│   │   │   │
│   │   │   ├── config/                    # Configuration Classes
│   │   │   │   ├── SecurityConfig.java
│   │   │   │   ├── JwtAuthFilter.java
│   │   │   │   ├── JwtUtils.java
│   │   │   │   ├── UserDetailsConfig.java
│   │   │   │   ├── DataInitializer.java
│   │   │   │   ├── GlobalExceptionHandler.java
│   │   │   │   ├── ErrorResponse.java
│   │   │   │   ├── ResourceNotFoundException.java
│   │   │   │   ├── AuthorizationException.java
│   │   │   │   └── IllegalOperationException.java
│   │   │   │
│   │   │   └── MaturityAssessmentApplication.java
│   │   │
│   │   └── resources/
│   │       └── application.properties
│   │
│   └── test/
│       └── java/com/master_thesis/maturity_assessment/
│           └── MaturityAssessmentApplicationTests.java
│
├── mvnw                               # Maven Wrapper script (Unix)
├── mvnw.cmd                          # Maven Wrapper script (Windows)
└── pom.xml                           # Maven dependencies
```

## Quick Start

### Prerequisites

- Java 21 JDK
- PostgreSQL running on port 5432
- Database named `maturity-db` created

### Running the Application

```bash
# Create the ignored local configuration first
cp .env.template .env

# Using Maven Wrapper (recommended)
./mvnw spring-boot:run

# Or run the compiled JAR
./mvnw clean package
java -jar target/maturity_assessment-0.0.1-SNAPSHOT.jar
```

The application will start on **http://localhost:8080**

Docker Compose is reserved for the online VM deployment. See the root
[Getting Started guide](../GETTING_STARTED.md) for local database and first-user
bootstrap instructions.

## Configuration

Copy `.env.template` to the ignored `.env` and configure the database connection
and `JWT_SECRET`. `application.properties` maps those environment variables to
Spring properties and contains only non-secret application defaults. Keep
`SPRING_FLYWAY_ENABLED=false` for a brand-new local database; see the root setup
guide for why the current migrations are legacy upgrades rather than a baseline.

### Gmail campaign invitations

Campaign creation automatically queues one personalized invitation email per
participant after the database transaction commits. Each message contains the
respondent's `/assessment?campaignToken=...` link. The raw token exists only
while that event is being delivered; the database continues to store only its
SHA-256 hash.

Copy the credential placeholders and fill in the custom Gmail account:

```bash
cp .env.template .env
```

```dotenv
APP_MAIL_ENABLED=true
MAIL_USERNAME=your-campaign-account@gmail.com
MAIL_PASSWORD=your-16-character-google-app-password
MAIL_FROM=your-campaign-account@gmail.com
APP_FRONTEND_URL=http://localhost:3000/filipevm
```

Enable 2-Step Verification on the Google account and create a
[Google App Password](https://support.google.com/accounts/answer/185833) for
`MAIL_PASSWORD`; remove the spaces Google uses when displaying it, and do not
use or commit the normal account password.

Spring Boot automatically imports `backend/.env` when started from either the
repository root or the `backend/` directory. A manual backend run therefore
needs no shell export:

```bash
./mvnw spring-boot:run
```

Restart the backend after changing `.env` because configuration is loaded only
at startup. OS environment variables and JVM/system properties override values
from the file.

Email is disabled by default. SMTP delivery runs asynchronously after commit,
so a temporary Gmail failure is logged without rolling back the newly created
campaign. This POC does not yet persist delivery status or retry failed mail.

## API documentation

The [API guide](./docs/api/README.md) contains onboarding, authentication,
conventions, workflows, and a complete linked endpoint reference.
Start with [your first request](./docs/api/getting-started.md), or browse the
[endpoint index](./docs/api/README.md#endpoint-index).

When changing an endpoint, follow the
[documentation maintenance guide](./docs/api/maintaining.md).

## Related Documentation

- [Project Overview](../PROJECT_OVERVIEW.md)
- [Architecture](../ARCHITECTURE.md)
- [Getting Started](../GETTING_STARTED.md)
- [API Documentation](./docs/api/README.md)
- [Database Schema](../DATABASE_SCHEMA.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)

## Resources

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Spring Security Documentation](https://spring.io/projects/spring-security)
- [Hibernate Documentation](https://hibernate.org/orm/documentation/)
- [JWT.io](https://jwt.io/)
- [Lombok Documentation](https://projectlombok.org/)
