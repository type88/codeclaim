# DNS & Email Setup Guide

This guide will walk you through the essential DNS and email configurations needed to launch your promo code distribution platform professionally. We'll set up everything from domain configuration to transactional emails that actually reach your users' inboxes.

## Domain Strategy

### Primary Domain Setup

**Recommendation:** Use a `.com` domain for maximum trust and deliverability. Avoid new TLDs like `.app` or `.dev` for your main platform - they still carry deliverability penalties with some email providers.

**Structure:**
- Main app: `yourdomain.com`
- API: `api.yourdomain.com`
- Admin panel: `admin.yourdomain.com`
- Status page: `status.yourdomain.com`

### DNS Provider Selection

**Use Cloudflare** - it's free, fast, and includes built-in DDoS protection. The interface is developer-friendly and their API is excellent for automation.

**Why not your registrar's DNS?**
- GoDaddy/Namecheap DNS is slow (300ms+ response times vs Cloudflare's 14ms)
- Limited features
- Poor uptime compared to Cloudflare's 99.99%

### Essential DNS Records

```dns
# Core application
A     @           192.0.2.1
A     www         192.0.2.1
AAAA  @           2001:db8::1
AAAA  www         2001:db8::1

# Subdomains
CNAME api         api-server.yourhost.com
CNAME admin       admin-server.yourhost.com
CNAME status      status-page.service.com

# Email authentication (configured in next section)
TXT   @           "v=spf1 include:_spf.google.com ~all"
TXT   _dmarc      "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com"

# Security
TXT   @           "google-site-verification=your-verification-string"
CAA   @           0 issue "letsencrypt.org"
```

## Email Infrastructure

### Transactional Email Provider

**Use Resend** - specifically built for developers, excellent deliverability, and generous free tier (3,000 emails/month).

**Why not competitors?**
- SendGrid: Complex interface, frequent delivery issues
- Mailgun: Expensive beyond free tier, poor dashboard
- Amazon SES: Requires technical setup, easy to misconfigure

### Resend Setup Process

1. **Create account** at resend.com
2. **Add your domain** in the dashboard
3. **Verify ownership** with DNS TXT record
4. **Configure DKIM** by adding provided DNS records
5. **Set up webhook endpoints** for delivery tracking

### Email Authentication Records

Add these DNS records exactly as provided by Resend:

```dns
# DKIM (Domain Keys Identified Mail)
TXT   resend._domainkey    "provided-by-resend"

# SPF (Sender Policy Framework)
TXT   @                   "v=spf1 include:_spf.resend.com ~all"

# DMARC (Domain-based Message Authentication)
TXT   _dmarc              "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; ruf=mailto:dmarc@yourdomain.com; fo=1"
```

**Wait 24-48 hours** for DNS propagation before sending emails.

## SSL/TLS Configuration

### Certificate Management

**Use Let's Encrypt** through your hosting provider or Cloudflare's Universal SSL.

**Required certificates:**
- Primary domain (yourdomain.com, www.yourdomain.com)
- API subdomain (api.yourdomain.com)
- Admin subdomain (admin.yourdomain.com)

### Security Headers

Configure these headers in your web server or through Cloudflare:

```nginx
# Strict Transport Security
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

# Content Security Policy
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com

# X-Frame-Options
X-Frame-Options: DENY

# X-Content-Type-Options
X-Content-Type-Options: nosniff
```

## Email Templates & Deliverability

### Critical Email Types

**1. Promo Code Delivery**
- Subject: "Your [APP_NAME] promo code is ready"
- Must include: Code, expiration date, redemption instructions
- Send immediately upon request

**2. Welcome Sequence**
- Subject: "Welcome to [APP_NAME] - Get started in 2 minutes"
- Include: Getting started guide, support contact
- Send within 5 minutes of signup

**3. Developer Notifications**
- Subject: "New codes claimed for [APP_NAME]"
- Include: Usage stats, remaining codes
- Send daily digest if activity occurred

### Template Best Practices

**Keep it simple:** Text-to-image ratio should be 60:40. Too many images trigger spam filters.

**Include unsubscribe:** Required by law and improves deliverability.

**Use proper sender name:** "CodeDrop Team" not "noreply@yourdomain.com"

**Test across clients:** Use Litmus or Email on Acid to preview in Gmail, Outlook, Apple Mail.

## Monitoring & Analytics

### Email Performance Tracking

Set up these webhooks in Resend:
- `delivered` - Track successful delivery
- `opened` - Monitor engagement
- `clicked` - Track link clicks
- `bounced` - Handle invalid emails
- `complained` - Monitor spam reports

### DNS Monitoring

**Use UptimeRobot** (free) to monitor:
- Main domain response time
- API endpoint availability
- SSL certificate expiration
- DNS resolution speed

Set up alerts for:
- Response time > 2 seconds
- Downtime > 1 minute
- SSL expiring in 30 days

## Security Considerations

### Domain Protection

**Enable domain lock** at your registrar to prevent unauthorized transfers.

**Set up CAA records** to restrict which Certificate Authorities can issue certificates:

```dns
CAA   @   0 issue "letsencrypt.org"
CAA   @   0 issue "digicert.com"
CAA   @   0 iodef "mailto:security@yourdomain.com"
```

### Email Security

**DMARC policy progression:**
1. Start with `p=none` to monitor
2. Move to `p=quarantine` after 1 week of clean reports
3. Advance to `p=reject` after 1 month of no issues

**Monitor DMARC reports** using a service like Postmark's DMARC Digests (free) to catch spoofing attempts.

## Launch Checklist

### Pre-Launch (Do 1 week before)
- [ ] DNS records propagated and verified
- [ ] SSL certificates installed and tested
- [ ] Email authentication configured (SPF, DKIM, DMARC)
- [ ] Transactional email templates created and tested
- [ ] Monitoring alerts configured
- [ ] Security headers implemented

### Launch Day
- [ ] Send test emails to Gmail, Outlook, Yahoo accounts
- [ ] Verify all subdomains resolve correctly
- [ ] Check SSL ratings on SSLLabs.com (aim for A+)
- [ ] Test email deliverability with Mail Tester (aim for 8/10+)
- [ ] Confirm webhook endpoints receive data

### Post-Launch (Within 48 hours)
- [ ] Monitor email delivery rates (should be >95%)
- [ ] Check for DNS resolution issues
- [ ] Review email performance metrics
- [ ] Verify DMARC reports show alignment

## Common Issues & Solutions

**Email going to spam?**
- Check your domain reputation on Sender Score
- Verify DKIM signature is valid
- Reduce image-to-text ratio in emails
- Warm up your domain by sending low volumes initially

**Slow DNS resolution?**
- Switch to Cloudflare DNS (1.1.1.1)
- Check for misconfigured records
- Verify TTL settings (use 300 seconds for active development)

**SSL certificate errors?**
- Ensure all subdomains are included in certificate
- Check certificate chain completeness
- Verify proper redirect from HTTP to HTTPS

This setup will give you a professional, secure, and reliable foundation for your promo code platform. Focus on getting email deliverability right from day one - it's much harder to fix reputation issues after launch than to prevent them.