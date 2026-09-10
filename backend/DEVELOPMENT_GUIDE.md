# Backend Development Guide

This guide provides best practices, coding standards, and patterns for developing the backend of the Maturity Assessment Platform.

## Table of Contents

- [Coding Standards](#coding-standards)
- [Architecture Patterns](#architecture-patterns)
- [Entity Design](#entity-design)
- [Service Layer](#service-layer)
- [Controller Layer](#controller-layer)
- [Security Best Practices](#security-best-practices)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Performance Optimization](#performance-optimization)

---

## Coding Standards

### Java Code Style

**Naming Conventions:**

- Classes: `PascalCase` (e.g., `AssessmentService`)
- Methods: `camelCase` (e.g., `createAssessment`)
- Variables: `camelCase` (e.g., `maturityModel`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `SECRET_KEY`)
- Packages: `lowercase` (e.g., `com.master_thesis.maturity_assessment`)

**Class Organization:**

```java
@Entity
@Table(name = "users")
@Data  // Lombok annotation
public class User {
    // 1. Static constants
    private static final String DEFAULT_ROLE = "USER";

    // 2. Instance variables
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String email;

    // 3. Constructors (if not using Lombok)

    // 4. Methods
    public void doSomething() {
        // Method implementation
    }

    // 5. Lifecycle callbacks
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
```

### Lombok Usage

**Always use Lombok to reduce boilerplate:**

```java
// For entities
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class Assessment {
    // Fields only, getters/setters generated
}

// For services (constructor injection)
@Service
@RequiredArgsConstructor
public class AssessmentService {
    private final AssessmentRepository assessmentRepository;
    // Constructor auto-generated for final fields
}

// For DTOs
@Data
@Builder
public class AssessmentResponse {
    private Long id;
    private String organizationName;
    // Builder pattern and getters/setters generated
}
```

**Important Lombok Annotations:**

- `@Data` - Generates getters, setters, toString, equals, hashCode
- `@RequiredArgsConstructor` - Constructor for final fields
- `@NoArgsConstructor` - Empty constructor (required by JPA)
- `@AllArgsConstructor` - Constructor with all fields
- `@Builder` - Builder pattern
- `@ToString(exclude = {"field"})` - Exclude fields from toString
- `@EqualsAndHashCode(exclude = {"field"})` - Exclude from equals/hashCode

### Package Structure

```
com.master_thesis.maturity_assessment/
├── [feature]/
│   ├── controllers/     # REST endpoints
│   ├── services/        # Business logic
│   ├── repository/      # Data access
│   ├── models/          # JPA entities
│   ├── dto/             # Data transfer objects
│   └── utils/           # Helper classes
└── config/              # Configuration & exception classes
```

**Feature Packages:**

- `auth` - Authentication, user management, admin, and refresh tokens
- `assessments` - Assessment creation, management, and evidence handling
- `maturity-models` - Maturity model, domain, and scoring management

---

## Architecture Patterns

### Layered Architecture

**Controller → Service → Repository → Database**

Each layer has a specific responsibility:

**Controller Layer:**

```java
@RestController
@RequestMapping("/api/v1/assessments")
@RequiredArgsConstructor
public class AssessmentController {

    private final AssessmentService assessmentService;

    // Only handles HTTP concerns:
    // - Request mapping
    // - Request/response conversion
    // - HTTP status codes

    @PostMapping
    public ResponseEntity<AssessmentResponse> create(@RequestBody AssessmentRequest request) {
        User user = getCurrentUser();
        AssessmentResponse response = assessmentService.createAssessment(request, user);
        return ResponseEntity.ok(response);
    }
}
```

**Service Layer:**

```java
@Service
@RequiredArgsConstructor
public class AssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final MaturityModelService maturityModelService;

    // Contains business logic:
    // - Validation
    // - Calculations
    // - Orchestration
    // - Transaction management

    @Transactional
    public AssessmentResponse createAssessment(AssessmentRequest request, User user) {
        // Validation
        validateRequest(request);

        // Business logic
        Assessment assessment = buildAssessment(request, user);
        calculateScores(assessment);

        // Persistence
        assessment = assessmentRepository.save(assessment);

        // Response mapping
        return toResponse(assessment);
    }
}
```

**Repository Layer:**

```java
public interface AssessmentRepository extends JpaRepository<Assessment, Long> {

    // Only data access methods:
    // - CRUD operations
    // - Custom queries

    List<Assessment> findByUserOrderByCreatedAtDesc(User user);

    @Query("SELECT a FROM Assessment a WHERE a.isCompleted = false")
    List<Assessment> findPendingAssessments();
}
```

### DTO Pattern

**Always use DTOs for API contracts, never expose entities directly:**

```java
// ✅ GOOD: Use DTOs
@PostMapping
public ResponseEntity<AssessmentResponse> create(@RequestBody AssessmentRequest request) {
    AssessmentResponse response = assessmentService.createAssessment(request);
    return ResponseEntity.ok(response);
}

// ❌ BAD: Exposing entities
@PostMapping
public ResponseEntity<Assessment> create(@RequestBody Assessment assessment) {
    Assessment saved = assessmentRepository.save(assessment);
    return ResponseEntity.ok(saved);
}
```

**Why DTOs?**

1. Decouple API from database structure
2. Prevent over-fetching (lazy loading issues)
3. Version API independently from entities
4. Validate input separately from entity validation
5. Control what data is exposed

**DTO Conversion:**

```java
// In Service layer
private AssessmentResponse toResponse(Assessment assessment) {
    return AssessmentResponse.builder()
        .id(assessment.getId())
        .organizationName(assessment.getOrganizationName())
        .overallAverage(assessment.getOverallAverage())
        .dimensionResults(toDimensionResults(assessment.getDimensionResults()))
        .build();
}

private Assessment toEntity(AssessmentRequest request, User user) {
    Assessment assessment = new Assessment();
    assessment.setOrganizationName(request.getOrganizationName());
    assessment.setAssessorName(request.getAssessorName());
    assessment.setUser(user);
    return assessment;
}
```

### Dependency Injection

**Always use constructor injection with `@RequiredArgsConstructor`:**

```java
// ✅ GOOD: Constructor injection
@Service
@RequiredArgsConstructor
public class AssessmentService {
    private final AssessmentRepository assessmentRepository;
    private final UserService userService;
}

// ❌ BAD: Field injection
@Service
public class AssessmentService {
    @Autowired
    private AssessmentRepository assessmentRepository;

    @Autowired
    private UserService userService;
}
```

**Benefits:**

- Immutable dependencies (final fields)
- Easier testing (can pass mocks to constructor)
- Explicit dependencies
- IDE support for required parameters

---

## Entity Design

### JPA Entities

**Best Practices:**

1. **Always specify table and column names:**

```java
@Entity
@Table(name = "assessments")
public class Assessment {

    @Column(name = "organization_name", nullable = false)
    private String organizationName;
}
```

2. **Use appropriate fetch strategies:**

```java
// Lazy loading for collections (default, but be explicit)
@OneToMany(mappedBy = "assessment", fetch = FetchType.LAZY)
private List<DimensionResult> dimensionResults;

// Eager loading only when always needed
@ManyToOne(fetch = FetchType.EAGER)
private User user;
```

3. **Implement cascade operations carefully:**

```java
// CASCADE.ALL for owned entities
@OneToMany(mappedBy = "assessment", cascade = CascadeType.ALL, orphanRemoval = true)
private List<DimensionResult> dimensionResults;

// No cascade for references
@ManyToOne
@JoinColumn(name = "user_id")
private User user;
```

4. **Avoid bidirectional relationships when possible:**

```java
// ✅ GOOD: Unidirectional
@Entity
public class Assessment {
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;
}

// ❌ AVOID: Bidirectional (unless truly needed)
@Entity
public class User {
    @OneToMany(mappedBy = "user")
    private List<Assessment> assessments;
}
```

5. **Exclude relationships from toString/equals:**

```java
@Entity
@Data
@ToString(exclude = {"dimensionResults", "user"})
@EqualsAndHashCode(exclude = {"dimensionResults", "user"})
public class Assessment {
    // Prevents infinite recursion and lazy loading issues
}
```

6. **Use auditing for timestamps:**

```java
@Entity
public class MaturityModel {

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
```

### Entity Lifecycle

```java
@Entity
public class Assessment {

    @PrePersist
    protected void onCreate() {
        // Before first save
        createdAt = LocalDateTime.now();
        if (isCompleted == null) {
            isCompleted = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        // Before update
        updatedAt = LocalDateTime.now();
    }

    @PostLoad
    protected void onLoad() {
        // After loading from database
    }
}
```

---

## Service Layer

### Service Design Principles

1. **Single Responsibility:** Each service handles one domain
2. **Transaction Management:** Use `@Transactional` appropriately
3. **Validation:** Validate input in services, not controllers
4. **Error Handling:** Throw meaningful exceptions

### Transaction Management

```java
@Service
@RequiredArgsConstructor
public class AssessmentService {

    // Read-only transaction for queries
    @Transactional(readOnly = true)
    public List<AssessmentResponse> getAssessmentsByUser(User user) {
        List<Assessment> assessments = assessmentRepository.findByUserOrderByCreatedAtDesc(user);
        return assessments.stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    // Write transaction for modifications
    @Transactional
    public AssessmentResponse createAssessment(AssessmentRequest request, User user) {
        // Multiple database operations in single transaction
        Assessment assessment = buildAssessment(request, user);
        assessment = assessmentRepository.save(assessment);

        List<DimensionResult> results = calculateDimensionResults(assessment);
        dimensionResultRepository.saveAll(results);

        return toResponse(assessment);
    }
}
```

### Validation

**Validate in service layer:**

```java
@Service
public class AssessmentService {

    public AssessmentResponse createAssessment(AssessmentRequest request, User user) {
        // Validate request
        validateRequest(request);

        // Validate business rules
        validateBusinessRules(request);

        // Process request
        return processAssessment(request, user);
    }

    private void validateRequest(AssessmentRequest request) {
        if (request.getOrganizationName() == null || request.getOrganizationName().isBlank()) {
            throw new IllegalArgumentException("Organization name is required");
        }

        if (request.getResponses() == null || request.getResponses().isEmpty()) {
            throw new IllegalArgumentException("Responses are required");
        }
    }

    private void validateBusinessRules(AssessmentRequest request) {
        MaturityModelDTO selectedModel = maturityModelService
            .getMaturityModelById(request.getMaturityModelId());
        if (!Boolean.TRUE.equals(selectedModel.getIsActive())) {
            throw new RuntimeException("The selected maturity model version is inactive");
        }

        // Validate all questions are answered
        validateAllQuestionsAnswered(request, selectedModel);
    }
}
```

### Error Handling

**Use custom exceptions:**

```java
// Define custom exceptions
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}

public class ValidationException extends RuntimeException {
    public ValidationException(String message) {
        super(message);
    }
}

// Use in services
@Service
public class AssessmentService {

    public AssessmentResponse getAssessmentById(Long id, User user) {
        Assessment assessment = assessmentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Assessment not found: " + id));

        if (!assessment.getUser().getId().equals(user.getId())) {
            throw new ForbiddenException("Not authorized to view this assessment");
        }

        return toResponse(assessment);
    }
}

// Handle globally in controller advice
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        ErrorResponse error = new ErrorResponse(404, ex.getMessage());
        return ResponseEntity.status(404).body(error);
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidation(ValidationException ex) {
        ErrorResponse error = new ErrorResponse(400, ex.getMessage());
        return ResponseEntity.status(400).body(error);
    }
}
```

---

## Controller Layer

### Controller Best Practices

```java
@RestController
@RequestMapping("/api/v1/assessments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")  // Configure appropriately for production
public class AssessmentController {

    private final AssessmentService assessmentService;

    // 1. Use appropriate HTTP methods
    @GetMapping  // Read
    @PostMapping  // Create
    @PutMapping  // Update
    @DeleteMapping  // Delete

    // 2. Use ResponseEntity for explicit status codes
    @PostMapping
    public ResponseEntity<AssessmentResponse> create(@RequestBody AssessmentRequest request) {
        User user = getCurrentUser();
        AssessmentResponse response = assessmentService.createAssessment(request, user);
        return ResponseEntity.ok(response);  // 200 OK
    }

    // 3. Use path variables and query parameters appropriately
    @GetMapping("/{id}")
    public ResponseEntity<AssessmentResponse> getById(@PathVariable Long id) {
        // Path variable for resource identifier
    }

    @GetMapping
    public ResponseEntity<List<AssessmentResponse>> list(
        @RequestParam(required = false) Boolean completed,
        @RequestParam(defaultValue = "0") int page
    ) {
        // Query parameters for filtering/pagination
    }

    // 4. Extract current user in controller
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User) {
            return (User) authentication.getPrincipal();
        }
        throw new RuntimeException("User not authenticated");
    }

    // 5. Keep controllers thin - delegate to services
    @PostMapping
    public ResponseEntity<AssessmentResponse> create(@RequestBody AssessmentRequest request) {
        // ✅ GOOD: Delegate to service
        User user = getCurrentUser();
        AssessmentResponse response = assessmentService.createAssessment(request, user);
        return ResponseEntity.ok(response);
    }

    // ❌ BAD: Business logic in controller
    @PostMapping
    public ResponseEntity<Assessment> create(@RequestBody AssessmentRequest request) {
        Assessment assessment = new Assessment();
        assessment.setOrganizationName(request.getOrganizationName());
        // ... more logic
        assessmentRepository.save(assessment);
        return ResponseEntity.ok(assessment);
    }
}
```

### REST API Conventions

**Resource Naming:**

- Use plural nouns: `/assessments`, `/users`, `/maturity-models`
- Use kebab-case for multi-word resources: `/maturity-models`
- Nest related resources: `/assessments/{id}/results`

**HTTP Methods:**

- `GET` - Retrieve resource(s), idempotent
- `POST` - Create resource, not idempotent
- `PUT` - Update resource (full replacement), idempotent
- `PATCH` - Partial update, not idempotent
- `DELETE` - Delete resource, idempotent

**Status Codes:**

- `200 OK` - Successful GET, PUT, DELETE
- `201 Created` - Successful POST (resource created)
- `204 No Content` - Successful DELETE (no response body)
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `500 Internal Server Error` - Server error

---

## Security Best Practices

### JWT Token Handling

The platform uses access tokens (30 min) and refresh tokens (30 days) with token rotation.

```java
@Service
public class JwtUtils {

    // Configured via application.properties
    @Value("${jwt.access-token.expiration:1800000}") // 30 min default
    private Long accessTokenExpiration;

    public String generateAccessToken(UserDetails userDetails) {
        return Jwts.builder()
            .setSubject(userDetails.getUsername())
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
            .signWith(getSigningKey())
            .compact();
    }
}

// Refresh tokens are managed by RefreshTokenService
// Token rotation: old refresh token is revoked when a new one is issued
```
```

### Password Security

```java
@Service
public class AuthenticationService {

    private final PasswordEncoder passwordEncoder;

    // ✅ GOOD: Always hash passwords
    public User registerUser(UserDTO userDTO) {
        User user = new User();
        user.setEmail(userDTO.getEmail());
        user.setPassword(passwordEncoder.encode(userDTO.getPassword())); // Hash password
        return userRepository.save(user);
    }

    // ❌ BAD: Never store plain text passwords
    public User registerUser(UserDTO userDTO) {
        User user = new User();
        user.setEmail(userDTO.getEmail());
        user.setPassword(userDTO.getPassword()); // Plain text!
        return userRepository.save(user);
    }
}
```

### Authorization Checks

The platform uses hierarchical roles: ADMIN > CURATOR > USER.

```java
// Method-level authorization with @PreAuthorize
@GetMapping("/all")
@PreAuthorize("hasAnyRole('CURATOR', 'ADMIN')")
public ResponseEntity<List<AssessmentResponse>> getAllAssessments() {
    // Only CURATOR and ADMIN can access
}

// Service-level checks
@Service
public class AssessmentService {

    public AssessmentResponse getAssessmentById(Long id, User user) {
        Assessment assessment = assessmentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Assessment not found"));

        // ✅ GOOD: Verify user has access
        if (!assessment.getUser().getId().equals(user.getId())) {
            throw new AuthorizationException("Not authorized to view this assessment");
        }

        return toResponse(assessment);
    }
}
```

---

## Error Handling

### Global Exception Handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(ResourceNotFoundException ex) {
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.NOT_FOUND.value())
            .error("Not Found")
            .message(ex.getMessage())
            .build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(IllegalArgumentException ex) {
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Bad Request")
            .message(ex.getMessage())
            .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        // Log full exception
        log.error("Unexpected error", ex);

        // Return generic message to client
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
            .error("Internal Server Error")
            .message("An unexpected error occurred")
            .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
```

---

## Testing

### Unit Testing Services

```java
@SpringBootTest
class AssessmentServiceTest {

    @MockBean
    private AssessmentRepository assessmentRepository;

    @MockBean
    private MaturityModelService maturityModelService;

    @Autowired
    private AssessmentService assessmentService;

    @Test
    void testCreateAssessment() {
        // Arrange
        User user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");

        AssessmentRequest request = new AssessmentRequest();
        request.setOrganizationName("Test Org");

        // Act
        AssessmentResponse response = assessmentService.createAssessment(request, user);

        // Assert
        assertNotNull(response);
        assertEquals("Test Org", response.getOrganizationName());
    }
}
```

### Integration Testing Controllers

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class AssessmentControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser(username = "test@example.com", roles = "USER")
    void testCreateAssessment() throws Exception {
        AssessmentRequest request = new AssessmentRequest();
        request.setOrganizationName("Test Org");

        mockMvc.perform(post("/api/v1/assessments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.organizationName").value("Test Org"));
    }
}
```

---

## Performance Optimization

### N+1 Query Problem

```java
// ❌ BAD: N+1 queries
@GetMapping
public List<AssessmentResponse> list() {
    List<Assessment> assessments = assessmentRepository.findAll();
    return assessments.stream()
        .map(a -> {
            // This triggers a query for each assessment!
            List<DimensionResult> results = a.getDimensionResults();
            return toResponse(a, results);
        })
        .collect(Collectors.toList());
}

// ✅ GOOD: Use JOIN FETCH
@Query("SELECT a FROM Assessment a JOIN FETCH a.dimensionResults WHERE a.user = :user")
List<Assessment> findByUserWithResults(@Param("user") User user);
```

### Pagination

```java
// Add pagination for large result sets
@GetMapping
public Page<AssessmentResponse> list(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
) {
    Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
    Page<Assessment> assessments = assessmentRepository.findAll(pageable);
    return assessments.map(this::toResponse);
}
```

### Caching

```java
// Enable caching for frequently accessed data
@Service
public class MaturityModelService {

    @Cacheable("activeModels")
    public List<MaturityModelDTO> getActiveMaturityModels(Long domainId) {
        // The list is cached by the optional domain ID.
        List<MaturityModel> models = domainId == null
            ? maturityModelRepository.findByIsActiveTrue()
            : maturityModelRepository.findByDomainIdAndIsActiveTrue(domainId);
        return models.stream().map(this::toDTO).toList();
    }

    @CacheEvict(value = "activeModels", allEntries = true)
    public void activateMaturityModel(Long id) {
        // This will invalidate the cache
        // ... activation logic
    }
}
```

---

## Additional Resources

- [Spring Boot Best Practices](https://spring.io/guides)
- [Effective Java (Book)](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [Clean Code (Book)](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [Project Root Documentation](../PROJECT_OVERVIEW.md)
