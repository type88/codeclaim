# Technical Stack

## Architecture Overview

Based on our research and the need to launch quickly with minimal budget, we recommend a **full-stack JavaScript architecture** with the following components:

- **Frontend**: React.js with TypeScript
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Redis for caching
- **Authentication**: Auth0 or Firebase Auth
- **File Storage**: AWS S3 or Cloudflare R2
- **Deployment**: Vercel (frontend) + Railway/Render (backend)
- **Analytics**: Mixpanel or PostHog

This stack allows one developer to work across the entire application, reducing complexity and costs while maintaining scalability.

## Frontend Technology

### React.js + TypeScript + Tailwind CSS

**Why this combination:**
- **React**: Largest ecosystem, abundant talent pool, excellent tooling
- **TypeScript**: Prevents runtime errors, improves developer experience
- **Tailwind**: Rapid UI development without custom CSS overhead

**Key libraries:**
```json
{
  "react": "^18.x",
  "typescript": "^5.x",
  "tailwindcss": "^3.x",
  "react-router-dom": "^6.x",
  "react-hook-form": "^7.x",
  "react-query": "^5.x",
  "@headlessui/react": "^1.x"
}
```

**Anti-pattern to avoid:** Don't use heavy component libraries like Material-UI or Ant Design. They add unnecessary bundle size and make customization difficult. Stick with Tailwind + Headless UI for maximum flexibility.

## Backend Technology

### Node.js + Express.js + PostgreSQL

**API Structure:**
```
/api/v1/
├── /auth          # Authentication endpoints
├── /developers    # Developer management
├── /campaigns     # Promo code campaigns
├── /codes         # Individual code management
├── /analytics     # Usage tracking
└── /platforms     # Platform detection/routing
```

**Essential middleware:**
- `helmet` - Security headers
- `cors` - Cross-origin requests
- `rate-limiter-flexible` - Rate limiting
- `winston` - Logging
- `joi` - Request validation

**Database schema priorities:**
1. **Users table** - Developer accounts
2. **Campaigns table** - Bulk upload sessions
3. **Codes table** - Individual promo codes with status tracking
4. **Redemptions table** - Usage analytics
5. **Platform_mappings table** - Auto-routing logic

## Database Design

### PostgreSQL Schema

```sql
-- Core tables for MVP
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  platform_type VARCHAR(50) NOT NULL, -- 'ios', 'android', 'mixed'
  total_codes INTEGER NOT NULL,
  used_codes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  code VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'available', -- 'available', 'used', 'expired'
  used_at TIMESTAMP NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_campaign_status (campaign_id, status),
  INDEX idx_code_lookup (code)
);
```

**Why PostgreSQL over MongoDB:**
- ACID compliance for critical promo code operations
- Better performance for analytical queries (usage tracking)
- Mature ecosystem with excellent Node.js support
- JSON columns available when needed

## Authentication System

### Recommended: Auth0

**Implementation approach:**
```javascript
// Frontend - React context
const AuthProvider = ({ children }) => {
  const { user, isLoading } = useAuth0();
  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Backend - JWT validation middleware
const validateJWT = jwt({
  secret: jwksRsa.expressJwtSecret({
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});
```

**Why Auth0 over custom auth:**
- Handles security best practices out of the box
- Free tier supports up to 7,000 active users
- Social login integration ready
- Reduces development time by 2-3 weeks

## Platform Detection Logic

### Smart Code Distribution Algorithm

The core differentiator requires intelligent platform detection:

```javascript
const detectPlatform = (userAgent, headers) => {
  // Mobile detection
  if (/iPhone|iPad/.test(userAgent)) return 'ios';
  if (/Android/.test(userAgent)) return 'android';
  
  // Desktop detection with preference hints
  if (headers['sec-ch-ua-platform']) {
    const platform = headers['sec-ch-ua-platform'].toLowerCase();
    if (platform.includes('mac')) return 'mac';
    if (platform.includes('windows')) return 'windows';
  }
  
  // Fallback detection
  if (/Mac OS/.test(userAgent)) return 'mac';
  if (/Windows/.test(userAgent)) return 'windows';
  
  return 'unknown';
};

const assignPromoCode = async (campaignId, detectedPlatform) => {
  // Try exact platform match first
  let code = await PromoCode.findOne({
    campaign_id: campaignId,
    platform: detectedPlatform,
    status: 'available'
  });
  
  // Fallback to generic codes if no platform-specific match
  if (!code) {
    code = await PromoCode.findOne({
      campaign_id: campaignId,
      platform: 'any',
      status: 'available'
    });
  }
  
  if (code) {
    await code.update({ 
      status: 'used', 
      used_at: new Date(),
      user_agent: userAgent 
    });
  }
  
  return code;
};
```

## File Upload Handling

### CSV Processing Pipeline

```javascript
const multer = require('multer');
const csv = require('csv-parse');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/csv') {
      return cb(new Error('Only CSV files allowed'));
    }
    cb(null, true);
  }
});

const processBulkUpload = async (csvBuffer, campaignId) => {
  return new Promise((resolve, reject) => {
    const codes = [];
    const parser = csv.parse({
      headers: true,
      skipEmptyLines: true
    });
    
    parser.on('readable', () => {
      let record;
      while (record = parser.read()) {
        codes.push({
          campaign_id: campaignId,
          code: record.code,
          platform: record.platform || 'any'
        });
      }
    });
    
    parser.on('end', async () => {
      try {
        await PromoCode.bulkCreate(codes);
        resolve(codes.length);
      } catch (error) {
        reject(error);
      }
    });
    
    parser.write(csvBuffer);
    parser.end();
  });
};
```

## Real-time Analytics

### Event Tracking System

```javascript
// Analytics service
class AnalyticsService {
  static async trackCodeUsage(campaignId, platform, userAgent) {
    await Analytics.create({
      campaign_id: campaignId,
      event_type: 'code_redeemed',
      platform,
      user_agent: userAgent,
      timestamp: new Date()
    });
    
    // Update campaign counters
    await Campaign.increment('used_codes', {
      where: { id: campaignId }
    });
  }
  
  static async getCampaignStats(campaignId) {
    return await Analytics.findAll({
      where: { campaign_id: campaignId },
      attributes: [
        'platform',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['platform']
    });
  }
}
```

## Deployment Strategy

### Vercel + Railway Configuration

**Frontend (Vercel):**
```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-api.railway.app/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

**Backend (Railway):**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

**Environment variables:**
```bash
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Auth
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=...
JWT_SECRET=...

# Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=...
```

## Performance Optimization

### Caching Strategy

```javascript
const Redis = require('redis');
const client = Redis.createClient(process.env.REDIS_URL);

// Cache frequently accessed campaigns
const getCampaignWithCache = async (campaignId) => {
  const cacheKey = `campaign:${campaignId}`;
  
  let campaign = await client.get(cacheKey);
  if (campaign) {
    return JSON.parse(campaign);
  }
  
  campaign = await Campaign.findById(campaignId);
  await client.setex(cacheKey, 300, JSON.stringify(campaign)); // 5min cache
  
  return campaign;
};
```

**Database indexing priorities:**
1. `promo_codes(campaign_id, status)` - Code assignment queries
2. `promo_codes(code)` - Code lookup for validation
3. `campaigns(user_id)` - Developer dashboard queries

## Security Considerations

### Input Validation & Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// API rate limiting
const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 accounts per hour per IP
  message: 'Too many accounts created, try again later'
});

// Code redemption limiting
const redemptionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 redemptions per minute per IP
  skipSuccessfulRequests: true
});

// CSV upload validation
const validateCSV = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSV file required' });
  }
  
  if (req.file.size > 10 * 1024 * 1024) { // 10MB
    return res.status(413).json({ error: 'File too large' });
  }
  
  next();
};
```

## Monitoring & Error Handling

### Logging Setup

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Error tracking for critical operations
const trackCodeRedemptionError = (error, campaignId, userAgent) => {
  logger.error('Code redemption failed', {
    error: error.message,
    campaign_id: campaignId,
    user_agent: userAgent,
    stack: error.stack
  });
};
```

## Development Workflow

### Local Development Setup

```bash
# Prerequisites
node -v  # Should be 18+
psql --version  # PostgreSQL 14+

# Setup steps
git clone <repo>
cd promo-platform
npm install

# Database setup
createdb promoplatform_dev
npm run migrate

# Environment
cp .env.example .env.local
# Fill in your Auth0, database credentials

# Start development
npm run dev  # Starts both frontend and backend
```

**Development tools:**
- ESLint + Prettier for code formatting
- Husky for pre-commit hooks
- Jest for testing
- Docker Compose for local PostgreSQL/Redis

This technical stack prioritizes speed of development, cost-effectiveness, and scalability to handle the platform's core requirement: intelligent promo code distribution with real-time tracking.