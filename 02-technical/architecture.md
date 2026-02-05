# Technical Architecture

## System Overview

Our promo code distribution platform is designed as a modern, scalable web application that handles high-volume code uploads and real-time distribution. Based on the research showing that platforms like Voucherify handle millions of codes with real-time validation, we need an architecture that can scale from day one.

**Core Architecture Decision: Serverless-First**
- Use AWS Lambda/Vercel Functions for API endpoints
- Leverage managed databases (PlanetScale MySQL or Supabase PostgreSQL)  
- Implement Redis for caching and real-time features
- Deploy static frontend to CDN (Vercel/Netlify)

This approach minimizes operational overhead while providing automatic scaling - crucial for a bootstrapped project with no initial budget.

## Technology Stack

### Frontend
**Next.js 14 with App Router**
- Server-side rendering for better SEO and performance
- Built-in API routes reduce infrastructure complexity
- Excellent TypeScript support
- Easy deployment on Vercel's free tier

**UI Framework: shadcn/ui + Tailwind CSS**
- Pre-built components reduce development time
- Consistent design system out of the box
- Highly customizable without framework lock-in

### Backend
**Database: PlanetScale (MySQL)**
- Generous free tier (5GB storage, 1 billion reads/month)
- Built-in branching for schema changes
- Automatic scaling without configuration
- Better cost predictability than PostgreSQL alternatives

**Authentication: Clerk**
- Free tier supports 10,000 monthly active users
- Built-in user management dashboard
- Social login support for user acquisition
- Handles compliance (GDPR, CCPA) automatically

**File Storage: AWS S3**
- Industry standard for bulk file uploads
- Pay-per-use pricing model
- Reliable for CSV processing workflows

### Real-time Features
**Upstash Redis**
- Serverless Redis for caching and real-time updates
- Free tier: 10,000 commands/day
- Perfect for tracking code usage counts
- WebSocket alternative for real-time dashboard updates

## Database Schema

### Core Tables

```sql
-- Developers who upload codes
CREATE TABLE developers (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Promo code campaigns
CREATE TABLE campaigns (
  id VARCHAR(255) PRIMARY KEY,
  developer_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  platform ENUM('ios', 'android', 'web', 'universal') NOT NULL,
  status ENUM('active', 'paused', 'completed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_developer_id (developer_id),
  FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE
);

-- Individual promo codes
CREATE TABLE promo_codes (
  id VARCHAR(255) PRIMARY KEY,
  campaign_id VARCHAR(255) NOT NULL,
  code VARCHAR(255) NOT NULL,
  status ENUM('available', 'claimed', 'used') DEFAULT 'available',
  claimed_by VARCHAR(255), -- User identifier
  claimed_at TIMESTAMP NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_campaign_status (campaign_id, status),
  INDEX idx_code (code),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Code distribution requests
CREATE TABLE distribution_requests (
  id VARCHAR(255) PRIMARY KEY,
  campaign_id VARCHAR(255) NOT NULL,
  user_identifier VARCHAR(255) NOT NULL, -- IP, device ID, or user ID
  platform ENUM('ios', 'android', 'web') NOT NULL,
  promo_code_id VARCHAR(255),
  status ENUM('pending', 'fulfilled', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_campaign_user (campaign_id, user_identifier),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE SET NULL
);
```

### Optimization Strategy
- **Partitioning**: Partition `promo_codes` table by `campaign_id` for large datasets
- **Indexing**: Compound indexes on frequently queried columns (`campaign_id + status`)
- **Archiving**: Move used codes to archive table after 30 days to maintain performance

## API Design

### RESTful Endpoints

```typescript
// Campaign management
POST   /api/campaigns              // Create new campaign
GET    /api/campaigns              // List developer's campaigns  
GET    /api/campaigns/:id          // Get campaign details
PATCH  /api/campaigns/:id          // Update campaign
DELETE /api/campaigns/:id          // Delete campaign

// Bulk code upload
POST   /api/campaigns/:id/codes    // Upload CSV of promo codes
GET    /api/campaigns/:id/codes    // Get codes with pagination

// Public distribution
GET    /api/distribute/:campaignId // Get available promo code
POST   /api/distribute/:campaignId // Request code with platform info

// Analytics
GET    /api/campaigns/:id/analytics // Real-time usage statistics
```

### Rate Limiting Strategy
- **Upload endpoints**: 10 requests/minute per developer
- **Distribution endpoints**: 100 requests/minute per IP
- **Analytics endpoints**: 60 requests/minute per developer

Use Upstash Redis to track rate limits across serverless functions.

## File Processing Pipeline

### CSV Upload Flow
1. **Client uploads CSV** to presigned S3 URL
2. **S3 triggers Lambda** function for processing
3. **Lambda validates** CSV format and content
4. **Batch insert** codes to database (1000 per batch)
5. **Update campaign status** and notify developer via WebSocket
6. **Delete processed file** from S3 after 24 hours

### Validation Rules
- Maximum 100,000 codes per upload
- Required columns: `code`, optional: `platform`, `metadata`
- Duplicate detection within campaign
- Code format validation (alphanumeric, length limits)

## Security Architecture

### Data Protection
- **Encryption at rest**: All database data encrypted
- **Encryption in transit**: HTTPS/TLS for all connections
- **Code obfuscation**: Display partial codes in UI (ABC***XYZ)
- **Access control**: Developers can only access their own campaigns

### Platform Detection
Instead of user authentication, use multiple signals:
```javascript
{
  userAgent: string,    // Browser/app identification
  platform: 'ios' | 'android' | 'web',
  fingerprint: string,  // Device fingerprinting
  timestamp: number,    // Request timing
  ipAddress: string     // Geographic/duplicate prevention
}
```

## Scalability Considerations

### Performance Targets
- **Code distribution**: < 200ms response time
- **Bulk upload**: Process 10,000 codes in < 30 seconds  
- **Real-time updates**: < 1 second latency
- **Concurrent users**: Support 1,000+ simultaneous code requests

### Scaling Strategy
1. **Database**: Read replicas for analytics queries
2. **Caching**: Redis for frequently accessed campaigns
3. **CDN**: Static assets and API responses where possible
4. **Queue system**: SQS for background processing of large uploads

## Deployment Architecture

### Production Environment
- **Frontend**: Vercel with global CDN
- **API**: Vercel serverless functions
- **Database**: PlanetScale with connection pooling
- **Cache**: Upstash Redis in same region as database
- **Storage**: AWS S3 with CloudFront distribution

### Monitoring Stack
- **Application monitoring**: Vercel Analytics
- **Error tracking**: Sentry (free tier: 5,000 errors/month)
- **Database monitoring**: PlanetScale built-in metrics
- **Uptime monitoring**: UptimeRobot (free tier: 50 monitors)

## Development Workflow

### Local Development
```bash
# Environment setup
npm install
npx drizzle-kit push:mysql  # Schema migration
npm run dev                 # Start development server
```

### Environment Variables
```env
DATABASE_URL=mysql://...
REDIS_URL=redis://...
CLERK_SECRET_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### Testing Strategy
- **Unit tests**: Jest for utility functions
- **Integration tests**: Playwright for API endpoints
- **End-to-end tests**: Playwright for critical user flows
- **Load testing**: Artillery.js for distribution endpoints

## Cost Optimization

### Free Tier Utilization
- **Vercel**: 100GB bandwidth, 1,000 serverless function invocations
- **PlanetScale**: 5GB storage, 1 billion row reads
- **Upstash**: 10,000 Redis commands/day
- **Clerk**: 10,000 monthly active users

### Projected Costs (Month 1-6)
- **Database**: $0 (within free tier)
- **Serverless functions**: $0-20 (depends on usage)
- **File storage**: $5-15 (CSV processing)
- **Redis**: $0 (within free tier)
- **Total**: $5-35/month for first 6 months

This architecture provides a solid foundation for rapid development while maintaining the flexibility to scale as the platform grows beyond the MVP stage.