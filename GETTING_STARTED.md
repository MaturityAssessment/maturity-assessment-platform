# Getting started

This guide covers two ways to run the platform:

- [Local development](#prerequisites): run PostgreSQL, Spring Boot, and Next.js directly on your workstation.
- [Online VM deployment with Docker](#online-vm-deployment-with-docker): build and run the platform on a server using Docker Compose.

The instructions below start with local development. For a server deployment,
go directly to the Docker section.

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

## Running locally after the first setup

After the initial setup process, only the following commands are needed to run the project:

```bash
# Starting the backend (terminal 1)
cd backend/
./mvnw spring-boot:run

# Starting the frontend (terminal 2)
cd frontend/
yarn dev
```

For a complete and easy to access bookmark, refer to the [Quick Reference](QUICK_REFERENCE.md).

> ***NOTE:*** Frontend changes are usually reflected immediately in the browser, but backend changes require restarting the Spring Boot server.

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

## Online VM deployment with Docker

This is a baseline for deploying on an online Linux VM using the repository's
`docker-compose.yml`. It runs PostgreSQL, pgAdmin, the backend, and the frontend.
Domain, HTTPS, and reverse-proxy configuration are managed separately on the VM;
the repository does not include that configuration.

### 1. Prepare the VM

Install Git, Docker Engine, and the Docker Compose plugin. Ensure Docker starts
on boot and your deployment user can run these commands:

```bash
docker --version
docker compose version
```

Java, Maven, Node.js, and Yarn are provided by the Docker build images and do not
need to be installed on the host. Clone the repository and run the remaining
commands from its root:

```bash
git clone <repository-url>
cd maturity-assessment-platform
```

### 2. Configure the environment files

As with local development, copy the templates and edit the ignored copies.
Do this once on a new VM; preserve existing values when updating a deployment.

```bash
cp .env.template .env
cp backend/.env.template backend/.env
```

In the root `.env`, set:

```dotenv
POSTGRES_DB=maturity-db
POSTGRES_USER=maturity_app
POSTGRES_PASSWORD=replace-with-a-strong-database-password
PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=replace-with-a-strong-pgadmin-password
CORS_ALLOWED_ORIGINS=https://your-public-host.example
```

Use the actual browser origin for CORS (scheme and hostname, plus port if
nonstandard), without `/filipevm` or a trailing slash. Both pgAdmin values are
required by the current Compose file.

In `backend/.env`, generate and set `JWT_SECRET` using `openssl rand -base64 48`,
keep `SPRING_FLYWAY_ENABLED=false` for a fresh database, and set:

```dotenv
APP_FRONTEND_URL=https://your-public-host.example/filipevm
```

Configure optional SMTP and assistant settings using the same template as local
development. Keep mail disabled until SMTP is configured. Integration endpoints
must be reachable from the backend container: `localhost` inside it refers to
the container itself.

Compose overrides the backend database connection and CORS values with the root
`.env` settings. It connects to PostgreSQL using the service hostname `postgres`,
so the local `DB_*` entries in `backend/.env` are not used for this deployment.
PostgreSQL creates the database and user on its first start with an empty data
volume; changing the root credentials later does not update an existing database.

The Docker frontend receives its `NEXT_PUBLIC_*` settings from build arguments
in `docker-compose.yml`; `frontend/.env.local` is not required for this workflow.
The current API URL is `/filipevm`, and the token settings are storage key names,
not secrets. Public frontend settings are embedded during the build, so rebuild
the frontend after changing those arguments. Keep all environment files private
and never put secrets in `NEXT_PUBLIC_*` values.

### 3. Configure public access and persistent storage

Point your domain at the VM and configure an HTTPS reverse proxy to forward
requests to the frontend on `127.0.0.1:3000`, preserving the `/filipevm` path.
The resulting application URL is:

```text
https://your-public-host.example/filipevm
```

The frontend's existing Next.js rewrite forwards `/filipevm/api/...` to
`http://backend:8080/api/...` over the Docker network. The public proxy can send
both page and API requests to the frontend. Preserve the request host and
forwarded protocol headers. Configure request-size and timeout limits to suit
evidence uploads.

The current Compose file publishes ports 3000, 8080, 5432, and 5050 on the host.
For a public VM, bind frontend access to loopback when using a host reverse proxy,
and remove unnecessary backend/database/admin port mappings or restrict them to
loopback. Allow public HTTP/HTTPS and your required SSH access through the VM's
network rules. pgAdmin currently uses the `/pgadmin-filipevm` prefix; publishing
its UI requires separate proxy configuration.

PostgreSQL uses the named `postgres_data` volume. Uploaded evidence uses the
backend directory `/app/uploads/evidence`, which currently has **no Compose
volume**. Before accepting real uploads, add a persistent bind mount or volume
for that directory and ensure it is writable by the image's `spring` user.
Without this, uploads can fail on permissions or be lost when the backend
container is replaced. Back up both database data and uploaded files.

### 4. Build, start, and verify

```bash
docker compose config --quiet
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 backend frontend
```

Allow the backend to finish starting, then check the public API route:

```bash
curl -i https://your-public-host.example/filipevm/api/v1/maturity-model
```

A `401` or `403` on this protected route still indicates that the API is
reachable. Open `/filipevm/register` on your public host and register the first
account. Connect to the container database:

```bash
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Use the inspection and promotion SQL in
[Create and promote the first user](#5-create-and-promote-the-first-user), then
sign in at `/filipevm/login`. Verify a basic assessment and evidence upload;
if SMTP is enabled, also check that invitation links use the public URL.

### 5. Update or stop the deployment

Back up the database and evidence before updates, then fetch the intended code
revision and rebuild from the repository root:

```bash
git pull --ff-only
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 backend frontend
```

Review template changes and apply new settings to the VM's existing environment
files. `docker compose up -d` applies backend environment changes by recreating
the affected container; a simple restart does not reload Compose environment
configuration. Frontend build-argument changes require a rebuild.

Stop the stack with `docker compose down`. The database volume is retained.
**Do not use `docker compose down -v` on a live deployment:** it removes the
Compose-managed data volumes, including the database. The backend currently uses
Hibernate schema updates, so review schema changes before deploying to live data.

## Related documentation

- [Project overview](./PROJECT_OVERVIEW.md)
- [Architecture](./ARCHITECTURE.md)
- [Database schema](./DATABASE_SCHEMA.md)
- [Backend development guide](./backend/DEVELOPMENT_GUIDE.md)
- [Frontend development guide](./frontend/DEVELOPMENT_GUIDE.md)
