# PromoCode Platform

A platform that automates promo code distribution for mobile app developers. Upload your bulk codes once, and users get the right code automatically based on their platform (iOS/Android) with real-time tracking of usage.

## What It Does

- **Smart Distribution**: Users request codes through a simple interface and automatically receive the right code for their platform
- **Bulk Upload**: Developers upload CSV files with hundreds or thousands of promo codes
- **Real-Time Tracking**: Live dashboard showing used vs unused codes, redemption rates, and platform breakdowns
- **Zero Fraud**: Each code is distributed only once, with built-in validation to prevent abuse

## Quick Start

```bash
# Clone and install
git clone https://github.com/your-org/promocode-platform
cd promocode-platform
npm install

# Set environment variables
cp .env.example .env
# Add your database URL and API keys

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see the platform.

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Node.js with Prisma ORM
- **Database**: PostgreSQL for code storage and tracking
- **Authentication**: NextAuth.js for developer accounts
- **File Processing**: CSV parsing for bulk uploads
- **Real-time Updates**: WebSocket connections for live dashboard

## Market Context

The mobile app promo code distribution market is fragmented. Existing solutions like Voucherify ($179+/month) and Talon.One (enterprise pricing) are built for e-commerce, not mobile app developers.

**Our advantage**: First platform built specifically for mobile app developers launching new apps/features. No complex setup, no marketing automation bloat - just code distribution that works.

**Target market**: 30+ million mobile developers worldwide who regularly launch apps and need to distribute Apple App Store and Google Play promo codes to reviewers, influencers, and beta testers.

## Architecture

```
/apps/web          - Next.js frontend
/apps/api          - Express.js API server
/packages/shared   - Shared types and utilities
/packages/db       - Prisma schema and migrations
```

## Getting Started

1. **For Developers**: Read [Developer Setup Guide](docs/DEVELOPER_SETUP.md)
2. **For Users**: Check [User Guide](docs/USER_GUIDE.md) 
3. **API Integration**: See [API Documentation](docs/API.md)
4. **Deployment**: Follow [Production Deploy Guide](docs/DEPLOYMENT.md)

## Core Features (MVP)

- [ ] Developer dashboard for code uploads
- [ ] User-facing code request interface
- [ ] Platform detection (iOS/Android)
- [ ] CSV bulk upload processing
- [ ] Real-time usage tracking
- [ ] Basic fraud prevention

## Business Model

Starting free with usage limits:
- Free: 100 codes/month
- Pro: $29/month for 10,000 codes
- Enterprise: Custom pricing for unlimited codes

Revenue projections based on similar developer tools show $50K+ ARR potential within 12 months with 1,000+ active developers.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/promocode-platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/promocode-platform/discussions)
- **Email**: support@promocode-platform.com

---

**Next Steps**: Start with the [Developer Setup Guide](docs/DEVELOPER_SETUP.md) to get your local environment running in under 10 minutes.