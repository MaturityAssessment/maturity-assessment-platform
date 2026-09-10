# Local development setup

This guide sets up PostgreSQL, the Spring Boot backend, and the Next.js frontend
directly on your workstation. Docker Compose in this repository is intended for
the online VM deployment and is not the local development path.

## Prerequisites

- Git
- JDK 21 (`java -version`)
- PostgreSQL 12 or newer (`psql --version`)
- Node.js 22.6 or newer (`node --version`)
- Corepack/Yarn 4 (`corepack enable`, then `yarn --version`)

Maven does not need to be installed separately; the backend includes Maven
Wrapper scripts.

## 1. Clone the repository

```bash
git clone <repository-url>
cd maturity-assessment-platform
```

## 2. Create the local database

Start PostgreSQL, connect as a PostgreSQL administrator, and create a dedicated
local application role and database. Replace the example password with your own.

On Linux, a typical command is:

```bash
sudo -u postgres psql
```

On other systems, use the PostgreSQL superuser configured by your installer,
for example `psql -U postgres`.

Run the following SQL inside `psql`:

```sql
CREATE USER maturity_app WITH PASSWORD 'choose-a-local-password';
CREATE DATABASE "maturity-db" OWNER maturity_app;
\q
```

Verify the new login:

```bash
psql -h localhost -U maturity_app -d maturity-db
```

Enter the password when prompted, then run `\q` to exit.

## 3. Configure and run the backend

The committed file is a template only. Copy it to the ignored local file:

```bash
cd backend
cp .env.template .env
```

Edit `backend/.env` and set at least:

```dotenv
DB_URL=jdbc:postgresql://localhost:5432/maturity-db
DB_USERNAME=maturity_app
DB_PASSWORD=choose-a-local-password
SPRING_FLYWAY_ENABLED=false
JWT_SECRET=replace-with-a-long-random-secret
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

Generate a suitable JWT signing secret instead of typing one:

```bash
openssl rand -base64 48
```

Paste the result as `JWT_SECRET`. It must be at least 32 bytes. Keep `.env`
local; the repository ignores it and tracks only `.env.template`.

### Fresh database and Flyway

Keep `SPRING_FLYWAY_ENABLED=false` for a newly created local database. Hibernate
creates the current schema through `spring.jpa.hibernate.ddl-auto=update`.
The repository currently starts its Flyway history at `V2`; those migrations
upgrade an existing legacy schema and are not a reproducible baseline for an
empty database. Do not enable Flyway on a fresh local database unless a proper
baseline migration is added or you are deliberately migrating a legacy copy.

Start the backend:

```bash
./mvnw spring-boot:run
```

It listens on `http://localhost:8080`. Leave this terminal running. The backend
loads `backend/.env` automatically at startup; restart it after changing values.

## 4. Configure and run the frontend

In a second terminal, from the repository root:

```bash
cd frontend
cp .env.template .env.local
corepack enable
yarn install
yarn dev
```

The template configures the frontend to call `http://localhost:8080`. The
`NEXT_PUBLIC_TOKEN` and `NEXT_PUBLIC_REFRESH_TOKEN` values are browser
`localStorage` key names—not credentials. All `NEXT_PUBLIC_*` values are exposed
to browser code and must never contain secrets.

This project currently has a `/filipevm` Next.js base path, so open:

- Application: `http://localhost:3000/filipevm`
- Registration: `http://localhost:3000/filipevm/register`
- Login: `http://localhost:3000/filipevm/login`

## 5. Create and promote the first user

New self-registered accounts are deliberately created with role `USER` and
approval status `PENDING`. Because no administrator exists in a fresh database,
register the first account in the UI and bootstrap it directly in PostgreSQL.

First inspect the row so you update the intended account:

```bash
psql -h localhost -U maturity_app -d maturity-db
```

```sql
SELECT id, email, role, approval_status
FROM users
ORDER BY id;

UPDATE users
SET role = 'ADMIN', approval_status = 'APPROVED'
WHERE email = 'your-email@example.com';

SELECT id, email, role, approval_status
FROM users
WHERE email = 'your-email@example.com';
\q
```

Replace the email with the address just registered. Log in after the update.
The first administrator can approve later registrations and manage roles from
the admin UI.

## 6. Optional: automatic campaign invitation email

The backend can asynchronously email each campaign participant a personal
assessment link after campaign creation commits. Mailing is off by default, so
the application runs locally without SMTP credentials.

### Gmail setup

1. Use a dedicated Gmail/Google Workspace sender account.
2. Enable 2-Step Verification for that account.
3. Create a Google App Password. Use the 16-character app password—not the
   account password—and remove display spaces.
4. Update `backend/.env`:

```dotenv
APP_MAIL_ENABLED=true
APP_FRONTEND_URL=http://localhost:3000/filipevm
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-campaign-account@gmail.com
MAIL_PASSWORD=your-google-app-password
MAIL_FROM=your-campaign-account@gmail.com
MAIL_STARTTLS_ENABLED=true
MAIL_STARTTLS_REQUIRED=true
MAIL_SSL_ENABLED=false
```

Restart the backend, create a campaign with a participant email, and check the
backend log for either `Sent campaign invitation email` or an SMTP error. Email
delivery occurs after the database transaction and does not roll back a campaign
when SMTP fails. Delivery status and retries are not persisted.

If the network requires Gmail implicit TLS, use port 465 and the alternative
settings documented at the bottom of `backend/.env.template`.

For another SMTP provider, replace the host, port, TLS settings, username,
password, and sender address with that provider's values.

## 7. Verify the installation

Backend/API (a `401` or `403` on a protected route still proves the server is
reachable):

```bash
curl -i http://localhost:8080/api/v1/maturity-model
```

Database tables and migration state:

```bash
psql -h localhost -U maturity_app -d maturity-db -c '\dt'
psql -h localhost -U maturity_app -d maturity-db -c \
  "SELECT id, email, role, approval_status FROM users ORDER BY id;"
```

Then open `http://localhost:3000/filipevm/login` and sign in as the promoted
administrator.

## Optional integrations

`backend/.env.template` also lists disabled settings for the hosted IAedu
assistant and an OpenAI-compatible local evaluation agent such as LM Studio.
Leave their endpoints, model names, and API keys blank while unused. Never put
backend secrets in a frontend `NEXT_PUBLIC_*` variable.

## Tests

Run each suite from its application directory:

```bash
# backend/
./mvnw test

# frontend/
yarn test
yarn typecheck
```

## Common problems

- **Backend cannot connect to PostgreSQL:** confirm PostgreSQL is running, the
  `maturity-db` database exists, and the three `DB_*` values match the role you
  created. Test them with `psql` first.
- **JWT startup/signing error:** ensure `JWT_SECRET` is present and at least 32
  bytes, then restart the backend.
- **Browser reports CORS errors:** keep
  `CORS_ALLOWED_ORIGINS=http://localhost:3000` and verify the frontend API URL is
  `http://localhost:8080`.
- **Frontend API requests have no host:** verify `frontend/.env.local` exists,
  then restart `yarn dev`; Next.js reads environment values at startup.
- **Registration cannot log in:** this is expected until an administrator sets
  `approval_status='APPROVED'`; bootstrap the first account with the SQL above.
- **Flyway fails on a fresh database:** restore
  `SPRING_FLYWAY_ENABLED=false`. The current migrations are upgrades, not a fresh
  schema baseline.
- **Mail is not sent:** confirm `APP_MAIL_ENABLED=true`, use an app password,
  restart the backend, and inspect its log. Some networks block SMTP ports.

## Related documentation

- [Project overview](./PROJECT_OVERVIEW.md)
- [Architecture](./ARCHITECTURE.md)
- [Database schema](./DATABASE_SCHEMA.md)
- [Backend development guide](./backend/DEVELOPMENT_GUIDE.md)
- [Frontend development guide](./frontend/DEVELOPMENT_GUIDE.md)
