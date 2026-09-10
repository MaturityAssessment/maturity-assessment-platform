# Frontend Development Guide

This guide provides best practices, coding standards, and patterns for developing the frontend of the Maturity Assessment Platform.

## Table of Contents

- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Component Development](#component-development)
- [State Management](#state-management)
- [API Integration](#api-integration)
- [Routing](#routing)
- [Styling](#styling)
- [TypeScript Best Practices](#typescript-best-practices)
- [Testing](#testing)
- [Performance Optimization](#performance-optimization)

---

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
- **State Management**: React Context API
- **Package Manager**: Yarn 4.5

---

## Project Structure

```
frontend/
├── public/
│   └── templates/              # CSV model templates
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
│   │   └── results/            # Results viewing & CSV export
│   │
│   ├── api/
│   │   ├── axios.ts            # Axios client with JWT interceptors
│   │   └── types.ts            # API type definitions
│   │
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components (button, input, form, label, modal)
│   │   ├── TopNavbar.tsx          # Navigation bar
│   │   ├── Button.tsx          # Custom button
│   │   └── EvidenceUpload.tsx  # Evidence file upload component
│   │
│   ├── context/
│   │   └── AuthContext.tsx     # Authentication context (tokens, user)
│   │
│   ├── hooks/
│   │   └── useAuth.ts          # Authentication hook
│   │
│   └── lib/
│       └── utils.ts            # Utility functions (cn, CSV export)
│
├── tests/
│   └── unit/                   # Unit tests, mirroring the src/ tree
│       ├── app/
│       └── lib/
│
├── .env                        # Environment variables
├── components.json             # shadcn/ui configuration
├── next.config.mjs             # Next.js configuration (standalone output)
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

---

## Coding Standards

### File Naming Conventions

- **Pages**: `page.tsx` (Next.js convention)
- **Layouts**: `layout.tsx` (Next.js convention)
- **Components**: `PascalCase.tsx` (e.g., `Button.tsx`, `AssessmentCard.tsx`)
- **Hooks**: `camelCase.ts` (e.g., `useAuth.ts`, `useFetch.ts`)
- **Utils**: `camelCase.ts` (e.g., `formatDate.ts`, `validators.ts`)
- **Types**: `types.ts` or `[feature].types.ts`

### Code Organization

```typescript
// 1. Imports - grouped by category
import React, { useState, useEffect } from "react"; // React
import { useRouter } from "next/navigation"; // Next.js
import apiClient from "@/api/axios"; // Internal
import { Button } from "@/components/ui/button"; // Components
import type { Assessment } from "@/api/types"; // Types

// 2. Type definitions
interface AssessmentCardProps {
  assessment: Assessment;
  onSelect?: (id: number) => void;
}

// 3. Component definition
export default function AssessmentCard({
  assessment,
  onSelect,
}: AssessmentCardProps) {
  // 4. Hooks
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Effect logic
  }, []);

  // 5. Event handlers
  const handleClick = () => {
    onSelect?.(assessment.id);
  };

  // 6. Render helpers
  const renderScore = () => {
    return <span>{assessment.overallAverage}</span>;
  };

  // 7. Return JSX
  return <div className="card">{/* Component JSX */}</div>;
}
```

### TypeScript Conventions

```typescript
// Use interfaces for object shapes
interface User {
  id: number;
  email: string;
  role: UserRole;
}

// Use type for unions, intersections, and utilities
type UserRole = "USER" | "CURATOR" | "ADMIN";
type Optional<T> = T | null | undefined;

// Use enums sparingly (prefer string unions)
// ❌ Avoid
enum Status {
  Active,
  Inactive,
}

// ✅ Prefer
type Status = "active" | "inactive";

// Always type component props
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

// Use React.FC sparingly, prefer explicit typing
// ✅ GOOD
export default function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}

// ❌ Less preferred (React.FC is falling out of favor)
const Button: React.FC<ButtonProps> = ({ label, onClick }) => {
  return <button onClick={onClick}>{label}</button>;
};
```

---

## Component Development

### Component Structure

**Functional Components:**

```typescript
"use client"; // Add for client components in App Router

import { useState } from "react";

interface CounterProps {
  initialCount?: number;
}

export default function Counter({ initialCount = 0 }: CounterProps) {
  const [count, setCount] = useState(initialCount);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

### Server vs Client Components

**Server Components (default in App Router):**

```typescript
// No 'use client' directive
// Can fetch data directly
// Cannot use hooks or event handlers

export default async function Dashboard() {
  // Server-side data fetching
  const data = await fetch("https://api.example.com/data");

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Render data */}
    </div>
  );
}
```

**Client Components:**

```typescript
"use client"; // Required for interactivity

import { useState } from "react";

export default function InteractiveForm() {
  const [value, setValue] = useState("");

  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

### Component Best Practices

1. **Keep Components Small and Focused**

```typescript
// ✅ GOOD: Single responsibility
function UserCard({ user }: { user: User }) {
  return (
    <div className="card">
      <UserAvatar user={user} />
      <UserInfo user={user} />
      <UserActions user={user} />
    </div>
  );
}

// ❌ BAD: Too much in one component
function UserCard({ user }: { user: User }) {
  return <div className="card">{/* 200 lines of JSX... */}</div>;
}
```

2. **Use Composition**

```typescript
// ✅ GOOD: Composable
function Card({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="card">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

// Usage
<Card title="Assessment">
  <AssessmentDetails assessment={assessment} />
</Card>;
```

3. **Prop Drilling vs Context**

```typescript
// ❌ BAD: Prop drilling through many levels
<Parent user={user}>
  <Child user={user}>
    <GrandChild user={user}>
      <GreatGrandChild user={user} />
    </GrandChild>
  </Child>
</Parent>;

// ✅ GOOD: Use Context for deeply nested data
const UserContext = createContext<User | null>(null);

function Parent({ user }: { user: User }) {
  return (
    <UserContext.Provider value={user}>
      <Child>
        <GrandChild>
          <GreatGrandChild />
        </GrandChild>
      </Child>
    </UserContext.Provider>
  );
}

function GreatGrandChild() {
  const user = useContext(UserContext);
  return <div>{user?.email}</div>;
}
```

4. **Memoization for Performance**

```typescript
import { useMemo, useCallback } from "react";

function ExpensiveComponent({ data }: { data: Data[] }) {
  // Memoize expensive calculations
  const processedData = useMemo(() => {
    return data.map((item) => expensiveOperation(item));
  }, [data]);

  // Memoize callbacks
  const handleClick = useCallback(() => {
    console.log("Clicked");
  }, []);

  return <div>{/* Render */}</div>;
}
```

---

## State Management

### Local State (useState)

```typescript
"use client";

import { useState } from "react";

export default function AssessmentForm() {
  // Simple state
  const [organizationName, setOrganizationName] = useState("");

  // Object state
  const [formData, setFormData] = useState({
    organizationName: "",
    assessorName: "",
  });

  // Update object state
  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <form>
      <input
        value={formData.organizationName}
        onChange={(e) => updateField("organizationName", e.target.value)}
      />
    </form>
  );
}
```

### Global State (Context API)

**Create Context:**

```typescript
// src/context/AuthContext.tsx
"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    // Login logic
    const response = await apiClient.post("/auth/login", { email, password });
    setUser(response.data);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
```

**Use Context:**

```typescript
"use client";

import { useAuth } from "@/context/AuthContext";

export default function UserProfile() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Please login</div>;
  }

  return (
    <div>
      <p>{user?.email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Form State (React Hook Form)

```typescript
"use client";

import { useForm } from "react-hook-form";

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    try {
      await apiClient.post("/auth/login", data);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register("email", {
          required: "Email is required",
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: "Invalid email address",
          },
        })}
        placeholder="Email"
      />
      {errors.email && <span>{errors.email.message}</span>}

      <input
        type="password"
        {...register("password", {
          required: "Password is required",
          minLength: {
            value: 8,
            message: "Password must be at least 8 characters",
          },
        })}
        placeholder="Password"
      />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
```

---

## API Integration

### Axios Configuration

```typescript
// src/api/axios.ts
import axios, { AxiosInstance } from "axios";

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add JWT access token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(process.env.NEXT_PUBLIC_TOKEN!);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh or redirect to login
      localStorage.removeItem(process.env.NEXT_PUBLIC_TOKEN!);
      localStorage.removeItem(process.env.NEXT_PUBLIC_REFRESH_TOKEN!);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### API Service Pattern

```typescript
// src/api/assessmentService.ts
import apiClient from "./axios";
import type { Assessment, AssessmentRequest } from "./types";

export const assessmentService = {
  // Get all assessments
  async getAll(): Promise<Assessment[]> {
    const response = await apiClient.get("/api/v1/assessments");
    return response.data;
  },

  // Get assessment by ID
  async getById(id: number): Promise<Assessment> {
    const response = await apiClient.get(`/api/v1/assessments/${id}`);
    return response.data;
  },

  // Create assessment
  async create(data: AssessmentRequest): Promise<Assessment> {
    const response = await apiClient.post("/api/v1/assessments", data);
    return response.data;
  },

  // Delete assessment
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/v1/assessments/${id}`);
  },
};
```

### Using API Services in Components

```typescript
"use client";

import { useState, useEffect } from "react";
import { assessmentService } from "@/api/assessmentService";
import type { Assessment } from "@/api/types";

export default function AssessmentList() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        setLoading(true);
        const data = await assessmentService.getAll();
        setAssessments(data);
      } catch (err) {
        setError("Failed to load assessments");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {assessments.map((assessment) => (
        <div key={assessment.id}>{assessment.organizationName}</div>
      ))}
    </div>
  );
}
```

### Custom Fetch Hook

```typescript
// src/hooks/useFetch.ts
import { useState, useEffect } from "react";

export function useFetch<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await fetcher();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fetcher]);

  return { data, loading, error };
}

// Usage
function AssessmentList() {
  const { data, loading, error } = useFetch(() => assessmentService.getAll());

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>{/* Render data */}</div>;
}
```

---

## Routing

### Next.js App Router

**File-based routing:**

```
app/
├── page.tsx              → /
├── login/
│   └── page.tsx          → /login
├── register/
│   └── page.tsx          → /register
├── dashboard/
│   └── page.tsx          → /dashboard
├── admin/
│   └── page.tsx          → /admin
├── domains/
│   └── page.tsx          → /domains
├── maturity-models/
│   ├── page.tsx          → /maturity-models
│   └── [id]/
│       └── page.tsx      → /maturity-models/:id
├── assessment/
│   └── page.tsx          → /assessment
├── assessments/
│   ├── page.tsx          → /assessments
│   └── all/
│       └── page.tsx      → /assessments/all
├── evaluate/
│   ├── page.tsx          → /evaluate
│   └── [id]/
│       └── page.tsx      → /evaluate/:id
└── results/
    └── page.tsx          → /results
```

### Navigation

```typescript
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Navigation() {
  const router = useRouter();

  // Programmatic navigation
  const goToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <nav>
      {/* Declarative navigation */}
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/assessments">Assessments</Link>

      {/* Programmatic */}
      <button onClick={goToDashboard}>Go to Dashboard</button>
    </nav>
  );
}
```

### Dynamic Routes

```typescript
// app/assessments/[id]/page.tsx
interface PageProps {
  params: { id: string };
}

export default async function AssessmentDetail({ params }: PageProps) {
  const { id } = params;

  // Fetch assessment data
  const assessment = await fetchAssessment(id);

  return (
    <div>
      <h1>Assessment {id}</h1>
      {/* Render assessment */}
    </div>
  );
}
```

### Protected Routes

```typescript
// app/dashboard/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated === false) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  return <div>Dashboard Content</div>;
}
```

---

## Styling

### Tailwind CSS

**Utility-first approach:**

```typescript
export default function Card() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Card Title</h2>
      <p className="text-gray-600">Card content</p>
    </div>
  );
}
```

**Responsive design:**

```typescript
<div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4">
  {/* Responsive width */}
</div>

<p className="text-sm md:text-base lg:text-lg">
  {/* Responsive text size */}
</p>
```

**Custom classes (when needed):**

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#10b981',
      },
      spacing: {
        '128': '32rem',
      }
    }
  }
}

// Usage
<div className="bg-primary p-128">Content</div>
```

### shadcn/ui Components

```typescript
// Import pre-built components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Form() {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="Enter email" />
      </div>

      <Button variant="default" size="lg">
        Submit
      </Button>
    </div>
  );
}
```

---

## TypeScript Best Practices

### Type Definitions

```typescript
// src/api/types.ts

// API response types
export interface UserDTO {
  id: number;
  email: string;
  role: UserRole;
}

export type UserRole = "USER" | "CURATOR" | "ADMIN";

export interface AssessmentResponse {
  id: number;
  overallAverage: number;
  overallPercentageScore?: number;
  overallMaturityLevel: string;
  isCompleted: boolean;
  responses?: { [key: string]: any };
  dimensionResults?: any[];
  createdAt: string;
  userEmail?: string;
  userId?: number;
}

export interface AuthenticationResponse {
  accessToken: string;
  refreshToken: string;
}

// Question types supported:
// "boolean" | "likert" | "open_answer" | "numeric" | "percentage" | "evidence" | "boolean_justification"
```

### Type Guards

```typescript
function isUser(obj: any): obj is User {
  return obj && typeof obj.id === "number" && typeof obj.email === "string";
}

// Usage
if (isUser(data)) {
  // TypeScript knows data is User here
  console.log(data.email);
}
```

### Utility Types

```typescript
// Partial - make all properties optional
type PartialUser = Partial<User>;

// Pick - select specific properties
type UserEmail = Pick<User, "email">;

// Omit - exclude specific properties
type UserWithoutId = Omit<User, "id">;

// Record - create object type
type UserMap = Record<number, User>;
```

---

## Testing

Frontend unit tests use Node's built-in test runner and TypeScript type stripping,
so they do not require a separate test framework. Use Node.js 22.6 or newer.

### Commands

Run commands from `frontend/`:

```bash
yarn test             # Entire frontend unit suite
yarn test:coverage    # Suite plus enforced coverage thresholds
yarn test:assessment  # Assessment feature tests
yarn test:dashboard   # Dashboard tests
yarn test:campaigns   # Campaign tests
yarn test:lib         # Shared-library tests
yarn typecheck        # Type-check application and test TypeScript
```

`yarn test:coverage` fails if aggregate line coverage drops below 90%, branch
coverage below 75%, or function coverage below 90%. Treat those values as a
regression floor, not a substitute for testing important behavior and failure
paths.

### Location and Naming

- Put unit tests in `tests/unit/` and mirror the module's path below `src/`.
- Name test files after the production module with the `.test.mts` suffix.
- Import the production module from `src/`; do not copy implementation logic into
  the test.
- Keep fixtures local unless several test files genuinely share them. Shared
  fixtures belong in a nearby `tests/unit/.../fixtures/` directory.
- Prefer testing pure feature logic, boundary values, invalid input, and state
  transitions. Avoid assertions that merely repeat an implementation detail.
- A test that reads component source is appropriate only for a structural
  regression that the current non-DOM runner cannot observe. Interactive React
  behavior should use a DOM-capable test setup when one is introduced.

Example mapping:

```text
src/app/assessment/assessmentAutosave.ts
tests/unit/app/assessment/assessmentAutosave.test.mts
```

Before opening a pull request, run `yarn test:coverage` and `yarn typecheck`
alongside linting and the production build.

---

## Performance Optimization

### Code Splitting

```typescript
// Dynamic imports
import dynamic from "next/dynamic";

const HeavyComponent = dynamic(() => import("./HeavyComponent"), {
  loading: () => <p>Loading...</p>,
  ssr: false, // Disable SSR if needed
});

export default function Page() {
  return <HeavyComponent />;
}
```

### Image Optimization

```typescript
import Image from "next/image";

export default function ProfilePicture() {
  return (
    <Image
      src="/profile.jpg"
      alt="Profile"
      width={200}
      height={200}
      priority // Load immediately
    />
  );
}
```

### Memoization

```typescript
import { memo, useMemo, useCallback } from "react";

// Memoize component
const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  return <div>{/* Render */}</div>;
});

// Memoize value
function Component({ data }) {
  const processedData = useMemo(() => {
    return expensiveCalculation(data);
  }, [data]);

  return <div>{processedData}</div>;
}

// Memoize callback
function Parent() {
  const handleClick = useCallback(() => {
    console.log("Clicked");
  }, []);

  return <Child onClick={handleClick} />;
}
```

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Project Root Documentation](../PROJECT_OVERVIEW.md)
