# Bootstrap Claude Code Prompts

This document contains carefully crafted prompts for generating high-quality code using Claude for the PromoCode Platform MVP. Each prompt is designed to produce production-ready code that follows best practices and integrates seamlessly with our tech stack.

## Core Architecture Prompts

### Database Schema Generation

```
You are building a promo code distribution platform. Generate a complete PostgreSQL schema with the following requirements:

CORE ENTITIES:
- Developers (users who upload codes)
- Projects (apps/services needing promo codes)
- Code Batches (bulk uploads of promo codes)
- Individual Codes (trackable promo codes)
- Redemptions (tracking when codes are used)
- Platforms (iOS, Android, Steam, etc.)

BUSINESS RULES:
- Each code belongs to one batch and one platform
- Codes can only be redeemed once
- Developers own multiple projects
- Projects can have multiple batches
- Real-time tracking of used vs unused codes is critical
- Support for expiration dates on codes

TECHNICAL REQUIREMENTS:
- Use UUIDs for primary keys
- Include proper indexes for query performance
- Add timestamps for all entities
- Include soft deletes where appropriate
- Design for horizontal scaling

Generate the complete schema with CREATE TABLE statements, indexes, and constraints. Include comments explaining key design decisions.
```

### API Route Structure

```
You are building a Next.js 14 API for a promo code distribution platform. Generate the complete API route structure using App Router.

REQUIRED ENDPOINTS:
- Developer authentication and management
- Project CRUD operations
- Bulk code upload and processing
- Code redemption tracking
- Real-time analytics dashboard
- Platform-specific code retrieval

TECHNICAL SPECIFICATIONS:
- Use TypeScript throughout
- Implement proper error handling with standardized responses
- Add rate limiting for public endpoints
- Include input validation with Zod schemas
- Support file uploads for CSV batch imports
- Return consistent JSON responses with proper HTTP status codes

AUTHENTICATION:
- JWT-based auth for developers
- API key authentication for automated redemptions
- Role-based access control

Generate the file structure and core implementation for each endpoint category. Focus on the most critical paths first: authentication, code upload, and code redemption.
```

### Frontend Component Architecture

```
You are building a React dashboard for developers to manage promo codes. Generate a complete component architecture using:

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Shadcn/ui components
- React Hook Form with Zod validation
- TanStack Query for data fetching

REQUIRED COMPONENTS:
1. Authentication flow (login, register, password reset)
2. Project management dashboard
3. Bulk code upload interface with CSV validation
4. Real-time analytics dashboard showing used vs unused codes
5. Code generation and export tools
6. Platform-specific code distribution

DESIGN PRINCIPLES:
- Mobile-first responsive design
- Accessible components (WCAG 2.1 AA)
- Loading states and error boundaries
- Optimistic updates where appropriate
- Real-time updates using Server-Sent Events

Generate the component structure, key interfaces, and implementation for the most critical user flows. Focus on the developer experience and performance.
```

## Feature-Specific Prompts

### CSV Upload Processing

```
Create a robust CSV upload and processing system for bulk promo code imports.

REQUIREMENTS:
- Support files up to 10MB
- Validate CSV format and required columns (code, platform, expiration_date)
- Process uploads in background jobs using BullMQ
- Provide real-time progress updates to the UI
- Handle duplicate codes gracefully
- Support multiple platforms in single upload
- Generate detailed error reports for invalid rows

TECHNICAL IMPLEMENTATION:
- Use Multer for file uploads in Next.js API routes
- Stream processing for large files to avoid memory issues
- Redis for job queue and progress tracking
- Implement proper error handling and rollback mechanisms
- Add comprehensive logging for debugging

Generate the complete implementation including API routes, background job processors, and frontend upload interface with progress tracking.
```

### Real-Time Analytics Engine

```
Build a real-time analytics system that tracks promo code usage across platforms.

CORE METRICS:
- Total codes uploaded vs redeemed (by project, platform, time period)
- Redemption rate trends over time
- Geographic distribution of redemptions (if available)
- Platform performance comparison
- Peak usage times and patterns

TECHNICAL ARCHITECTURE:
- Use PostgreSQL with optimized queries for analytics
- Implement caching layer with Redis for frequently accessed metrics
- Server-Sent Events for real-time dashboard updates
- Pre-computed aggregations for common queries
- Support for custom date ranges and filtering

DASHBOARD FEATURES:
- Interactive charts using Chart.js or similar
- Export functionality for reports
- Alert system for unusual patterns
- Mobile-responsive design

Generate the complete analytics pipeline including database queries, API endpoints, background aggregation jobs, and React dashboard components.
```

### Platform Detection & Auto-Distribution

```
Create an intelligent system that automatically serves the correct promo code based on user's platform detection.

PLATFORM DETECTION LOGIC:
- Parse User-Agent strings to identify iOS, Android, Windows, macOS
- Support deep linking from mobile apps
- Handle edge cases (web browsers on mobile, tablets)
- Allow manual platform override
- Track detection accuracy

AUTO-DISTRIBUTION FEATURES:
- Serve unused codes in FIFO order
- Support for platform-specific code pools
- Implement fair distribution algorithms
- Handle concurrent requests without conflicts
- Provide fallback options when platform codes are exhausted

TECHNICAL IMPLEMENTATION:
- Use Redis for atomic operations during code allocation
- Implement proper locking mechanisms
- Add comprehensive logging for distribution tracking
- Support for A/B testing different distribution strategies
- Rate limiting to prevent abuse

Generate the complete system including platform detection utilities, code allocation logic, API endpoints, and integration examples for common platforms.
```

## Integration & Security Prompts

### Authentication & Authorization System

```
Implement a comprehensive authentication system for the promo code platform.

AUTHENTICATION REQUIREMENTS:
- Developer account registration with email verification
- JWT-based session management with refresh tokens
- Password reset functionality
- Two-factor authentication (optional but recommended)
- API key generation for automated integrations

AUTHORIZATION LEVELS:
- Project owners (full access to their projects)
- Team members (read-only or specific permissions)
- API consumers (limited to code redemption)

SECURITY FEATURES:
- Rate limiting on auth endpoints
- Account lockout after failed attempts
- Secure password requirements
- Audit logging for sensitive operations
- CSRF protection for web interface

TECHNICAL STACK:
- NextAuth.js for OAuth providers (GitHub, Google)
- bcrypt for password hashing
- JWT with secure HTTP-only cookies
- Redis for session storage and rate limiting

Generate the complete authentication system including middleware, API routes, React hooks, and security configurations.
```

### Third-Party Integration Framework

```
Build a flexible integration framework that allows developers to connect the platform with external services.

SUPPORTED INTEGRATIONS:
- Slack/Discord notifications for code redemptions
- Webhook system for real-time events
- Zapier integration for workflow automation
- Analytics platforms (Google Analytics, Mixpanel)
- Email marketing tools (for code distribution)

WEBHOOK EVENTS:
- code.redeemed
- batch.uploaded
- project.created
- quota.exceeded
- batch.expired

TECHNICAL ARCHITECTURE:
- Event-driven architecture with reliable delivery
- Retry mechanisms with exponential backoff
- Signature verification for webhook security
- Rate limiting and payload validation
- Comprehensive logging and monitoring

DEVELOPER EXPERIENCE:
- Easy webhook configuration UI
- Payload examples and documentation
- Test webhook functionality
- Event filtering and transformation options

Generate the complete integration framework including event system, webhook delivery, UI for configuration, and example implementations for popular services.
```

## Deployment & Operations Prompts

### Production Deployment Configuration

```
Create a complete production deployment setup for the promo code platform.

INFRASTRUCTURE REQUIREMENTS:
- Docker containerization for all services
- PostgreSQL with read replicas for scaling
- Redis cluster for caching and job queues
- CDN for static assets and file uploads
- Load balancer with health checks

DEPLOYMENT STRATEGY:
- Blue-green deployments with zero downtime
- Database migration automation
- Environment-specific configurations
- Secrets management
- SSL/TLS termination

MONITORING & OBSERVABILITY:
- Application performance monitoring
- Error tracking and alerting
- Database query performance monitoring
- Real-time logs aggregation
- Business metrics dashboards

SECURITY HARDENING:
- Container security scanning
- Dependency vulnerability checking
- Network segmentation
- Regular security updates
- Backup and disaster recovery

Generate Docker configurations, deployment scripts, monitoring setup, and production checklist. Focus on reliability and security best practices.
```

## Usage Guidelines

### Prompt Engineering Best Practices

1. **Be Specific**: Always include exact technology versions, file structures, and business requirements
2. **Context First**: Start each prompt with the broader system context before diving into specifics
3. **Examples Matter**: Include concrete examples of expected inputs/outputs when relevant
4. **Error Handling**: Always request comprehensive error handling in generated code
5. **Testing**: Ask for test cases and validation logic alongside implementation code

### Iteration Strategy

1. **Start with Architecture**: Use the core architecture prompts first to establish the foundation
2. **Build Features Incrementally**: Implement one feature completely before moving to the next
3. **Test Early**: Generate and run tests for each component as you build
4. **Integrate Continuously**: Ensure each new piece works with existing code
5. **Refactor Regularly**: Use Claude to suggest improvements and optimizations

### Quality Assurance

- **Code Reviews**: Ask Claude to review generated code for security vulnerabilities and performance issues
- **Documentation**: Request inline comments and README files for complex implementations
- **Type Safety**: Ensure all TypeScript interfaces and types are properly defined
- **Accessibility**: Verify frontend components meet WCAG guidelines
- **Performance**: Request optimization suggestions for database queries and React components

## Next Steps

1. Start with the database schema generation prompt to establish your data foundation
2. Build the authentication system to secure your platform
3. Implement the core API endpoints for code management
4. Create the developer dashboard interface
5. Add real-time analytics and monitoring
6. Configure production deployment pipeline

Each prompt is designed to generate production-ready code that you can immediately integrate into your platform. Customize the prompts based on your specific requirements and infrastructure constraints.