# PromoSync - Automated Promo Code Distribution Platform

Deploy a complete promo code distribution platform in under 5 minutes. No backend required.

## 🚀 Quick Deploy

**Recommended: Cloudflare Pages (Free + fast global CDN)**

1. Fork this repo
2. Connect to [Cloudflare Pages](https://pages.cloudflare.com/)
3. Deploy with these settings:
   - Build command: Leave empty (static site)
   - Build output directory: `/`
   - Root directory: `/`

**Alternative: Netlify**
- Drag the entire folder to [Netlify Drop](https://app.netlify.com/drop)
- Live in 30 seconds

**Alternative: Vercel**
- Import repo at [vercel.com/new](https://vercel.com/new)
- Zero configuration needed

## 🎨 Customization Guide

### Colors & Branding
Edit `css/style.css`:

```css
:root {
  --primary: #2563eb;     /* Main brand color */
  --secondary: #64748b;   /* Secondary text */
  --success: #10b981;     /* Success states */
  --background: #ffffff;  /* Page background */
}
```

### Copy & Messaging
Edit `index.html` sections:
- Hero headline: Line 45
- Value propositions: Lines 65-85
- CTA buttons: Lines 95, 210
- Footer copy: Lines 180-195

### Fonts
Current: Inter (Google Fonts). To change:
1. Replace line 8 in `index.html` with your Google Fonts URL
2. Update `font-family` in `css/style.css` line 12

## 📊 Analytics Setup

### Google Analytics 4
Add before `</head>` in `index.html`:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Plausible Analytics (Recommended - Privacy-focused)
Add before `</head>`:

```html
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

## 📧 Email Signup Integration

### ConvertKit (Recommended for developers)
Replace the form action in `index.html` line 130:

```html
<form action="https://app.convertkit.com/forms/YOUR_FORM_ID/subscriptions" method="post">
```

### Mailchimp
Replace form section with Mailchimp embed code from your account.

### Custom Webhook
Point form to your own endpoint:

```html
<form action="https://yourapi.com/subscribe" method="post">
```

## 🖼️ Image Specifications

### Social Sharing (Open Graph)
- **Size**: 1200×630px
- **File**: `images/og-image.png`
- **Format**: PNG or JPG
- **Text**: Keep readable at 1200px width minimum

### Favicons
Required files in `/images/`:
- `favicon.ico` - 32×32px (legacy browsers)
- `apple-touch-icon.png` - 180×180px (iOS)
- `favicon-32x32.png` - 32×32px (modern browsers)
- `favicon-16x16.png` - 16×16px (browser tabs)

Use [RealFaviconGenerator](https://realfavicongenerator.net/) for perfect results.

## ⚡ Performance Optimizations

### Already Included
- Minified CSS
- Compressed images
- Lazy loading
- Critical CSS inlined

### Add These for Production
1. **CDN**: Cloudflare Pages includes this automatically
2. **Caching**: Set in `_headers` file (Netlify) or dashboard settings
3. **Compression**: Enabled by default on all recommended hosts

## 🔧 Technical Architecture

This is a static landing page optimized for promo code platform launches:

- **No build process** - Pure HTML/CSS/JS
- **Mobile-first** - Works on all devices
- **SEO optimized** - Structured data, meta tags, semantic HTML
- **Conversion focused** - Based on $51.13B coupon market research

## 📈 Conversion Optimization

### A/B Testing
Test these elements in order of impact:
1. **Headline** - Try benefit-focused vs feature-focused
2. **CTA button text** - "Start Free Trial" vs "Get Early Access"
3. **Social proof** - Add developer testimonials when available
4. **Value props** - Lead with time savings vs cost savings

### Heat Mapping
Add Hotjar or Microsoft Clarity to see user behavior:

```html
<script>
    (function(h,o,t,j,a,r){
        // Hotjar tracking code
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
</script>
```

## 🎯 Market Positioning

Based on research of the $8.87B (2024) → $51.13B (2034) coupon code market:

- **Primary competitors**: Seguno, Vouchery, TargetBay
- **Differentiation**: Platform-specific auto-assignment (iOS/Android)
- **Target**: Mobile app developers launching new apps/features
- **Pricing gap**: Most solutions target enterprise ($500+/month)

## 📱 Mobile App Developer Targeting

### Key Pain Points (From Research)
1. **Apple App Store**: Limited to 100 promo codes per app version
2. **Google Play**: 500 codes per quarter limit
3. **Manual distribution** - No automated platform-specific assignment
4. **Tracking complexity** - Real-time usage visibility missing

### Messaging Focus
- "Stop manually distributing promo codes"
- "Real-time tracking of used vs unused codes"
- "Platform detection and auto-assignment"
- "First-mover advantage in underserved market"

## 🚀 Launch Checklist

- [ ] Deploy to production URL
- [ ] Test mobile responsiveness
- [ ] Verify email signup works
- [ ] Add analytics tracking
- [ ] Submit to Google Search Console
- [ ] Set up social media cards preview
- [ ] Create launch content calendar
- [ ] Monitor for 404s and broken links

## 📞 Support

For technical issues with deployment:
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Netlify Support](https://docs.netlify.com/)
- [GitHub Issues](https://github.com/yourusername/promosync/issues)

**Deploy now. Iterate fast. The promo code distribution market is waiting.**