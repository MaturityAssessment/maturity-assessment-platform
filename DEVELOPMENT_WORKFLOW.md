# Development Workflow Guide

This guide explains common development workflows and how to implement new features in the Maturity Assessment Platform.

## Table of Contents

- [Adding a New Feature](#adding-a-new-feature)
- [Creating a New API Endpoint](#creating-a-new-api-endpoint)
- [Adding a New Page](#adding-a-new-page)
- [Modifying Database Schema](#modifying-database-schema)
- [Implementing Authentication Changes](#implementing-authentication-changes)
- [Bug Fixing Workflow](#bug-fixing-workflow)
- [Code Review Checklist](#code-review-checklist)

---

## Adding a New Feature

### End-to-End Feature Implementation

Let's walk through adding a new feature: **Assessment Comments**

#### 1. Define Requirements

**Feature:** Allow users to add comments to assessments.

**Requirements:**

- Users can add multiple comments to an assessment
- Comments have text content and timestamp
- Only assessment owner can add comments
- Comments are displayed in chronological order

#### 2. Backend Implementation

**Step 2.1: Create Entity**

```java
// backend/src/main/java/com/master_thesis/maturity_assessment/assessments/models/AssessmentComment.java

package com.master_thesis.maturity_assessment.assessments.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "assessment_comments")
@NoArgsConstructor
public class AssessmentComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    private Assessment assessment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
```

**Step 2.2: Update Assessment Entity**

```java
// Add to Assessment.java
@OneToMany(mappedBy = "assessment", cascade = CascadeType.ALL)
private List<AssessmentComment> comments;
```

**Step 2.3: Create Repository**

```java
// backend/src/main/java/com/master_thesis/maturity_assessment/assessments/repository/AssessmentCommentRepository.java

package com.master_thesis.maturity_assessment.assessments.repository;

import com.master_thesis.maturity_assessment.assessments.models.AssessmentComment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AssessmentCommentRepository extends JpaRepository<AssessmentComment, Long> {
    List<AssessmentComment> findByAssessmentIdOrderByCreatedAtDesc(Long assessmentId);
}
```

**Step 2.4: Create DTOs**

```java
// backend/src/main/java/com/master_thesis/maturity_assessment/assessments/dto/CommentRequest.java

package com.master_thesis.maturity_assessment.assessments.dto;

import lombok.Data;

@Data
public class CommentRequest {
    private String content;
}

// backend/src/main/java/com/master_thesis/maturity_assessment/assessments/dto/CommentResponse.java

package com.master_thesis.maturity_assessment.assessments.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class CommentResponse {
    private Long id;
    private String content;
    private String userEmail;
    private LocalDateTime createdAt;
}
```

**Step 2.5: Update Service**

```java
// Add to AssessmentService.java

@Transactional
public CommentResponse addComment(Long assessmentId, CommentRequest request, User user) {
    // Validate
    Assessment assessment = assessmentRepository.findById(assessmentId)
        .orElseThrow(() -> new ResourceNotFoundException("Assessment not found"));

    if (!assessment.getUser().getId().equals(user.getId())) {
        throw new ForbiddenException("Not authorized to comment on this assessment");
    }

    // Create comment
    AssessmentComment comment = new AssessmentComment();
    comment.setContent(request.getContent());
    comment.setAssessment(assessment);
    comment.setUser(user);

    comment = commentRepository.save(comment);

    return toCommentResponse(comment);
}

@Transactional(readOnly = true)
public List<CommentResponse> getComments(Long assessmentId, User user) {
    Assessment assessment = assessmentRepository.findById(assessmentId)
        .orElseThrow(() -> new ResourceNotFoundException("Assessment not found"));

    if (!assessment.getUser().getId().equals(user.getId())) {
        throw new ForbiddenException("Not authorized to view comments");
    }

    List<AssessmentComment> comments = commentRepository.findByAssessmentIdOrderByCreatedAtDesc(assessmentId);

    return comments.stream()
        .map(this::toCommentResponse)
        .collect(Collectors.toList());
}

private CommentResponse toCommentResponse(AssessmentComment comment) {
    return CommentResponse.builder()
        .id(comment.getId())
        .content(comment.getContent())
        .userEmail(comment.getUser().getEmail())
        .createdAt(comment.getCreatedAt())
        .build();
}
```

**Step 2.6: Create Controller Endpoints**

```java
// Add to AssessmentController.java

@PostMapping("/{id}/comments")
public ResponseEntity<CommentResponse> addComment(
    @PathVariable Long id,
    @RequestBody CommentRequest request
) {
    User user = getCurrentUser();
    CommentResponse response = assessmentService.addComment(id, request, user);
    return ResponseEntity.ok(response);
}

@GetMapping("/{id}/comments")
public ResponseEntity<List<CommentResponse>> getComments(@PathVariable Long id) {
    User user = getCurrentUser();
    List<CommentResponse> comments = assessmentService.getComments(id, user);
    return ResponseEntity.ok(comments);
}
```

**Step 2.7: Test Backend**

```bash
# Start backend
./mvnw spring-boot:run

# Test with curl
curl -X POST http://localhost:8080/api/v1/assessments/1/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "This is a test comment"}'
```

#### 3. Frontend Implementation

**Step 3.1: Define Types**

```typescript
// frontend/src/api/types.ts

export interface Comment {
  id: number;
  content: string;
  userEmail: string;
  createdAt: string;
}

export interface CommentRequest {
  content: string;
}
```

**Step 3.2: Create API Service**

```typescript
// frontend/src/api/commentService.ts

import apiClient from "./axios";
import type { Comment, CommentRequest } from "./types";

export const commentService = {
  async getComments(assessmentId: number): Promise<Comment[]> {
    const response = await apiClient.get(
      `/api/v1/assessments/${assessmentId}/comments`,
    );
    return response.data;
  },

  async addComment(
    assessmentId: number,
    data: CommentRequest,
  ): Promise<Comment> {
    const response = await apiClient.post(
      `/api/v1/assessments/${assessmentId}/comments`,
      data,
    );
    return response.data;
  },
};
```

**Step 3.3: Create Comment Component**

```typescript
// frontend/src/app/assessments/[id]/Comments.tsx
"use client";

import { useState, useEffect } from "react";
import { commentService } from "@/api/commentService";
import type { Comment } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CommentsProps {
  assessmentId: number;
}

export default function Comments({ assessmentId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadComments();
  }, [assessmentId]);

  const loadComments = async () => {
    try {
      const data = await commentService.getComments(assessmentId);
      setComments(data);
    } catch (error) {
      console.error("Failed to load comments", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setLoading(true);
      await commentService.addComment(assessmentId, { content: newComment });
      setNewComment("");
      await loadComments();
    } catch (error) {
      console.error("Failed to add comment", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Comments</h3>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          disabled={loading}
        />
        <Button type="submit" disabled={loading}>
          Add
        </Button>
      </form>

      <div className="space-y-2">
        {comments.map((comment) => (
          <div key={comment.id} className="border rounded p-4">
            <p className="text-sm text-gray-600">{comment.userEmail}</p>
            <p>{comment.content}</p>
            <p className="text-xs text-gray-400">
              {new Date(comment.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 3.4: Integrate into Assessment Page**

```typescript
// frontend/src/app/assessments/[id]/page.tsx

import Comments from "./Comments";

export default function AssessmentDetail({
  params,
}: {
  params: { id: string };
}) {
  const assessmentId = parseInt(params.id);

  return (
    <div>
      {/* Existing assessment details */}

      <Comments assessmentId={assessmentId} />
    </div>
  );
}
```

**Step 3.5: Test Frontend**

```bash
# Start frontend
cd frontend
yarn dev

# Navigate to http://localhost:3000/assessments/1
# Test adding comments
```

#### 4. Update Documentation

**Update API_DOCUMENTATION.md:**

```markdown
### Add Comment to Assessment

**Endpoint:** `POST /api/v1/assessments/{id}/comments`
**Authentication:** Required
**Request Body:**
{
"content": "Comment text"
}
**Response:** CommentResponse object
```

---

## Creating a New API Endpoint

### Quick Reference Checklist

Backend steps:

1. ✅ Create/update entity if needed
2. ✅ Create repository method if needed
3. ✅ Create DTOs (request/response)
4. ✅ Implement service method
5. ✅ Create controller endpoint
6. ✅ Add security configuration if needed
7. ✅ Test with curl/Postman

Frontend steps:

1. ✅ Add types to `types.ts`
2. ✅ Create/update API service
3. ✅ Use in component
4. ✅ Test in browser

---

## Adding a New Page

### Example: Creating a Reports Page

**Step 1: Create Page File**

```typescript
// frontend/src/app/reports/page.tsx
"use client";

import { useState, useEffect } from "react";

export default function ReportsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Reports</h1>
      {/* Page content */}
    </div>
  );
}
```

**Step 2: Add Navigation Link**

```typescript
// In your navigation component
<Link href="/reports">Reports</Link>
```

**Step 3: Add Layout if Needed**

```typescript
// frontend/src/app/reports/layout.tsx

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="reports-layout">
      <aside>Sidebar</aside>
      <main>{children}</main>
    </div>
  );
}
```

**Step 4: Add Authentication Protection**

```typescript
// frontend/src/app/reports/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ReportsPage() {
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

  return <div>Reports Page</div>;
}
```

---

## Modifying Database Schema

### Safe Schema Changes

**Development Environment:**

1. Modify entity class
2. Restart Spring Boot (Hibernate updates schema automatically)
3. Verify changes in database

**Production Environment:**

1. Create Flyway/Liquibase migration
2. Test migration on staging database
3. Apply to production with rollback plan

### Example: Adding a Field

**Step 1: Modify Entity**

```java
@Entity
public class Assessment {
    // Existing fields...

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;  // New field
}
```

**Step 2: Restart Application**

```bash
# Hibernate will execute:
# ALTER TABLE assessments ADD COLUMN notes TEXT;
```

**Step 3: Create Flyway Migration (for production)**

```sql
-- src/main/resources/db/migration/V2__add_assessment_notes.sql

ALTER TABLE assessments ADD COLUMN notes TEXT;
```

---

## Implementing Authentication Changes

### Example: Adding Role-Based Authorization

**Step 1: Update Security Config**

```java
// backend/src/main/java/com/master_thesis/maturity_assessment/config/SecurityConfig.java

@Bean
public SecurityFilterChain defaultSecurityFilterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/v1/auth/**").permitAll()
            .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
            .requestMatchers("/api/v1/evaluator/**").hasAnyRole("CURATOR", "ADMIN")
            .anyRequest().authenticated())
        // ... rest of configuration
    return http.build();
}
```

**Step 2: Add Role Check in Service**

```java
@Service
public class AssessmentService {

    public void deleteAssessment(Long id, User user) {
        if (!user.getRole().equals(UserRole.ADMIN)) {
            throw new ForbiddenException("Only admins can delete assessments");
        }

        assessmentRepository.deleteById(id);
    }
}
```

**Step 3: Update Frontend Authorization**

```typescript
// frontend/src/components/AdminOnly.tsx
"use client";

import { useAuth } from "@/context/AuthContext";

export default function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user?.role !== "ADMIN") {
    return null;
  }

  return <>{children}</>;
}

// Usage
<AdminOnly>
  <Button onClick={handleDelete}>Delete</Button>
</AdminOnly>;
```

---

## Bug Fixing Workflow

### 1. Reproduce the Bug

- Identify exact steps to reproduce
- Check browser console for frontend errors
- Check backend logs for backend errors
- Note the environment (dev/prod)

### 2. Locate the Issue

**Frontend Issues:**

```bash
# Check browser console
# Look for React errors, network errors
# Check Redux/Context state

# Common places to check:
# - Component render logic
# - API calls
# - State updates
# - Event handlers
```

**Backend Issues:**

```bash
# Check application logs
# Look for exceptions, stack traces

# Common places to check:
# - Controller input validation
# - Service business logic
# - Database queries
# - Security filters
```

### 3. Fix and Test

- Make minimal changes to fix the issue
- Test the specific bug scenario
- Test related functionality
- Check for edge cases

### 4. Prevent Regression

- Add a test case for the bug
- Update documentation if needed
- Consider if similar bugs exist elsewhere

---

## Code Review Checklist

### Backend Code Review

**Code Quality:**

- [ ] Follows Java naming conventions
- [ ] Uses Lombok appropriately
- [ ] No hardcoded values (use configuration)
- [ ] Proper error handling
- [ ] Meaningful variable/method names

**Architecture:**

- [ ] Proper separation of concerns (Controller/Service/Repository)
- [ ] DTOs used instead of entities in API
- [ ] Services contain business logic, not controllers
- [ ] Transactions used appropriately

**Security:**

- [ ] Authentication required where needed
- [ ] Authorization checks implemented
- [ ] Input validation performed
- [ ] No SQL injection vulnerabilities
- [ ] Passwords hashed, never plain text

**Performance:**

- [ ] No N+1 query issues
- [ ] Appropriate fetch strategies (LAZY/EAGER)
- [ ] Indexes on foreign keys
- [ ] Pagination for large result sets

**Testing:**

- [ ] Unit tests for services
- [ ] Integration tests for controllers
- [ ] Edge cases covered

### Frontend Code Review

**Code Quality:**

- [ ] TypeScript types defined
- [ ] Follows React best practices
- [ ] Proper component composition
- [ ] No console.log statements (use proper logging)

**Architecture:**

- [ ] Components are focused and reusable
- [ ] API calls in services, not components
- [ ] State management appropriate (local vs. context)
- [ ] Proper error handling

**UI/UX:**

- [ ] Loading states shown
- [ ] Error messages displayed
- [ ] Responsive design
- [ ] Accessible (keyboard navigation, ARIA labels)

**Performance:**

- [ ] No unnecessary re-renders
- [ ] Images optimized (Next.js Image component)
- [ ] Code splitting where appropriate
- [ ] Memoization used for expensive operations

**Security:**

- [ ] JWT token stored securely
- [ ] No sensitive data in client-side code
- [ ] XSS prevention (proper escaping)
- [ ] CSRF protection enabled

**Testing:**

- [ ] Unit tests are under `frontend/tests/unit/` and mirror the `src/` path
- [ ] New behavior, edge cases, and failure paths are covered
- [ ] `yarn test:coverage` passes from `frontend/`
- [ ] `yarn typecheck` validates both production and test TypeScript
- [ ] Production components and their tests are not mixed in the same folder

---

## Git Workflow

### Branch Strategy

```bash
main              # Production-ready code
├── develop       # Integration branch
    ├── feature/assessment-comments
    ├── feature/reports-page
    ├── bugfix/login-validation
    └── hotfix/security-patch
```

### Feature Development

```bash
# Create feature branch
git checkout -b feature/assessment-comments

# Make changes and commit
git add .
git commit -m "Add assessment comments feature"

# Push to remote
git push origin feature/assessment-comments

# Create pull request on GitHub/GitLab
# After approval, merge to develop
```

### Commit Message Convention

```
feat: Add assessment comments functionality
fix: Resolve login validation issue
docs: Update API documentation
refactor: Simplify assessment calculation logic
test: Add unit tests for comment service
style: Format code with prettier
chore: Update dependencies
```

---

## Docker Workflow

### Running with Docker

```bash
# Start all services (PostgreSQL, pgAdmin, backend, frontend)
docker compose up --build

# Start in background
docker compose up -d --build

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop all services
docker compose down

# Stop and remove volumes (reset database)
docker compose down -v
```

### Docker Services

| Service  | Port | Description         |
| -------- | ---- | ------------------- |
| frontend | 3000 | Next.js application |
| backend  | 8080 | Spring Boot API     |
| postgres | 5432 | PostgreSQL database |
| pgadmin  | 5050 | pgAdmin database UI |

### VM Deployment

For VM deployment, use the VM-specific compose file:

```bash
docker compose -f docker-compose.vm.yml up --build
```

This uses `Dockerfile.frontend` which accepts a build-time `NEXT_PUBLIC_API_URL` argument.

### Docker Troubleshooting

**Containers won't start:**

```bash
docker compose down -v
docker compose up --build
```

**Backend can't connect to database:**

- The backend depends on the `postgres` service health check
- Wait for PostgreSQL to be ready before the backend starts

**Frontend build fails:**

- Ensure `next.config.mjs` has `output: 'standalone'`
- Check that environment variables are passed correctly

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database migrations ready (if any)
- [ ] Environment variables configured
- [ ] Security credentials updated
- [ ] Documentation updated

### Deployment Steps

**Backend:**

```bash
# Build production JAR
./mvnw clean package -DskipTests

# Deploy to server
scp target/maturity_assessment-0.0.1-SNAPSHOT.jar user@server:/app/

# Restart service
ssh user@server "systemctl restart maturity-assessment"
```

**Frontend:**

```bash
# Build production bundle
yarn build

# Deploy to hosting (Vercel/Netlify/etc)
vercel deploy --prod
```

### Post-Deployment

- [ ] Verify application is running
- [ ] Check health endpoints
- [ ] Monitor error logs
- [ ] Test critical user flows
- [ ] Notify stakeholders

---

## Troubleshooting Guide

### Common Issues

**Issue: "Port already in use"**

```bash
# Kill process using port
lsof -ti:8080 | xargs kill -9  # Backend
lsof -ti:3000 | xargs kill -9  # Frontend
```

**Issue: "Database connection failed"**

```bash
# Check PostgreSQL is running
pg_isready

# Verify credentials in application.properties
# Check database exists
psql -U postgres -l
```

**Issue: "JWT token invalid"**

- Check access token expiration (30 minutes)
- Use refresh token endpoint to get a new access token
- Verify secret key matches between generation and validation
- Check token is being sent in Authorization header

**Issue: "CORS error"**

- Verify backend CORS configuration allows frontend origin
- Check request includes credentials
- Verify preflight OPTIONS requests succeed

**Issue: "Build fails"**

```bash
# Backend
./mvnw clean install -U  # Update dependencies

# Frontend
rm -rf node_modules yarn.lock
yarn install
```

---

This workflow guide should help you navigate common development tasks. For more specific details, refer to the other documentation files in this repository.
