# Data Model

## Core Entities

### PromoCode
The central entity representing an individual promotional code.

**Attributes:**
- `id` (UUID, Primary Key)
- `campaign_id` (UUID, Foreign Key to Campaign)
- `code` (String, 50 chars max, Unique)
- `platform` (Enum: iOS, Android, Windows, MacOS, Steam, Epic, Web)
- `status` (Enum: unused, used, expired)
- `used_at` (Timestamp, nullable)
- `used_by_user_id` (UUID, nullable, Foreign Key to User)
- `expires_at` (Timestamp)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**Indexes:**
- `idx_campaign_platform_status` on (campaign_id, platform, status)
- `idx_code_unique` on (code)
- `idx_expires_at` on (expires_at)

### Campaign
A collection of promo codes for a specific app/feature launch.

**Attributes:**
- `id` (UUID, Primary Key)
- `developer_id` (UUID, Foreign Key to Developer)
- `name` (String, 255 chars)
- `description` (Text, nullable)
- `app_name` (String, 255 chars)
- `status` (Enum: active, paused, completed, expired)
- `total_codes` (Integer, computed)
- `used_codes` (Integer, computed)
- `expires_at` (Timestamp)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**Computed Fields:**
- `usage_percentage` = (used_codes / total_codes) * 100
- `remaining_codes` = total_codes - used_codes

### Developer
The entity representing app developers who upload promo codes.

**Attributes:**
- `id` (UUID, Primary Key)
- `email` (String, 255 chars, Unique)
- `name` (String, 255 chars)
- `company_name` (String, 255 chars, nullable)
- `verified` (Boolean, default: false)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### User
End users who claim promo codes.

**Attributes:**
- `id` (UUID, Primary Key)
- `platform` (Enum: iOS, Android, Windows, MacOS, Steam, Epic, Web)
- `user_agent` (String, 500 chars, nullable)
- `ip_address` (String, 45 chars)
- `country_code` (String, 2 chars, nullable)
- `created_at` (Timestamp)

**Note:** We intentionally keep user data minimal to avoid privacy concerns. No email, name, or persistent identification beyond what's needed for basic fraud prevention.

### CodeRequest
Tracks when users request codes, for analytics and fraud prevention.

**Attributes:**
- `id` (UUID, Primary Key)
- `campaign_id` (UUID, Foreign Key to Campaign)
- `user_id` (UUID, Foreign Key to User)
- `platform` (Enum: iOS, Android, Windows, MacOS, Steam, Epic, Web)
- `code_id` (UUID, nullable, Foreign Key to PromoCode)
- `status` (Enum: fulfilled, no_codes_available, rate_limited, blocked)
- `created_at` (Timestamp)

**Indexes:**
- `idx_user_campaign` on (user_id, campaign_id)
- `idx_created_at` on (created_at)

## Platform Enumeration

Based on research showing developers distribute codes across multiple platforms:

```
iOS - Apple App Store promo codes
Android - Google Play promo codes  
Windows - Microsoft Store promo codes
MacOS - Mac App Store promo codes
Steam - Steam game keys
Epic - Epic Games Store codes
Web - Web app promo codes
```

## Data Relationships

### One-to-Many Relationships
- Developer → Campaigns (1:N)
- Campaign → PromoCodes (1:N)
- Campaign → CodeRequests (1:N)
- User → CodeRequests (1:N)

### One-to-One Relationships
- PromoCode → User (via used_by_user_id, when used)
- CodeRequest → PromoCode (when fulfilled)

## Business Rules

### Code Distribution Logic
1. **Platform Matching**: Users can only receive codes for their detected/selected platform
2. **One Per User Per Campaign**: Each user can only claim one code per campaign
3. **First Come, First Served**: Codes are allocated in creation order (FIFO)
4. **Expiration Handling**: Expired codes cannot be distributed

### Rate Limiting
- **Per IP**: Maximum 5 code requests per hour
- **Per Campaign**: Maximum 1 code per user lifetime
- **Global**: Track suspicious patterns (same IP requesting across many campaigns)

### Code Status Transitions
```
unused → used (when user claims and uses code)
unused → expired (when expires_at is reached)
used → used (final state)
expired → expired (final state)
```

## Analytics Schema

### CampaignStats (Materialized View)
Updated hourly via background job.

**Attributes:**
- `campaign_id` (UUID, Primary Key)
- `total_codes` (Integer)
- `used_codes` (Integer)
- `expired_codes` (Integer)
- `usage_rate` (Decimal, 2 places)
- `platform_breakdown` (JSON)
- `daily_usage` (JSON array)
- `last_updated` (Timestamp)

### PlatformStats (Materialized View)
Updated daily via background job.

**Attributes:**
- `platform` (Enum, Primary Key)
- `total_requests` (Integer)
- `fulfilled_requests` (Integer)
- `conversion_rate` (Decimal, 2 places)
- `date` (Date, Primary Key)

## Data Storage Considerations

### Database Choice: PostgreSQL
- **Why**: Excellent JSON support for flexible analytics, strong consistency for financial-like data (code allocation), and mature ecosystem
- **Alternative considered**: MySQL (lacks advanced JSON features we need for analytics)

### Partitioning Strategy
- **CodeRequest table**: Partition by month on `created_at`
- **PromoCode table**: Consider partitioning by `campaign_id` when we reach 10M+ codes

### Archival Strategy
- Archive completed campaigns older than 2 years
- Maintain aggregated stats indefinitely
- Hard delete user data after 1 year (GDPR compliance)

## Security & Privacy

### Data Encryption
- **At Rest**: All PII fields encrypted using application-level encryption
- **In Transit**: TLS 1.3 for all API communications

### PII Minimization
- No email/name collection for end users
- IP addresses hashed after 30 days
- User-agent strings truncated to remove identifying info

### Audit Trail
Every code status change logged with:
- Timestamp
- User ID (if applicable)
- IP address
- Action performed

## Migration Strategy

### Phase 1: Core MVP
- Implement Developer, Campaign, PromoCode entities
- Basic code upload and distribution functionality

### Phase 2: Analytics
- Add CodeRequest tracking
- Implement materialized views for stats

### Phase 3: Advanced Features
- Add fraud detection fields
- Implement rate limiting tables
- Add audit trail tables

## API Data Contracts

### Code Distribution Response
```json
{
  "success": true,
  "code": "ABC123XYZ",
  "platform": "iOS",
  "expires_at": "2025-02-15T23:59:59Z",
  "campaign": {
    "name": "MyApp Launch",
    "app_name": "MyApp"
  }
}
```

### Campaign Statistics Response
```json
{
  "id": "uuid",
  "name": "MyApp Launch",
  "total_codes": 1000,
  "used_codes": 247,
  "usage_rate": 24.7,
  "remaining_codes": 753,
  "platform_breakdown": {
    "iOS": {"total": 500, "used": 123},
    "Android": {"total": 500, "used": 124}
  },
  "daily_usage": [
    {"date": "2025-01-01", "used": 45},
    {"date": "2025-01-02", "used": 67}
  ]
}
```

This data model balances simplicity for MVP launch with scalability for future growth, while maintaining strong privacy protections and enabling the real-time tracking that differentiates our platform from existing solutions.