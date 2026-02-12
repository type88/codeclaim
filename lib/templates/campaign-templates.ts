export interface CampaignTemplate {
  name: string;
  description: string;
  promo_headline: string;
  promo_description: string;
  cta_text: string;
  require_auth: boolean;
  show_social_proof: boolean;
  social_proof_style: "claimed" | "remaining";
}

export const campaignTemplates: Record<string, CampaignTemplate> = {
  "product-hunt-launch": {
    name: "Product Hunt Launch",
    description: "High-volume giveaway for your launch day. No auth barrier, urgency-focused.",
    promo_headline: "Exclusive Launch Day Offer",
    promo_description: "We just launched! Grab a free code as a thank you for supporting us on launch day.",
    cta_text: "Claim Your Code",
    require_auth: false,
    show_social_proof: true,
    social_proof_style: "remaining",
  },
  "press-kit": {
    name: "Press & Review Kit",
    description: "Auth-gated access for journalists and reviewers. Professional, controlled.",
    promo_headline: "Media Review Access",
    promo_description: "Full access for press, journalists, and content creators. Sign in to verify your identity.",
    cta_text: "Get Review Code",
    require_auth: true,
    show_social_proof: false,
    social_proof_style: "claimed",
  },
  "beta-invite": {
    name: "Beta Invite",
    description: "Exclusive beta program with auth gate. Shows how many have joined.",
    promo_headline: "You're Invited to Beta",
    promo_description: "Join our exclusive beta program and help shape the future of the product. Your feedback matters.",
    cta_text: "Activate Beta Access",
    require_auth: true,
    show_social_proof: true,
    social_proof_style: "claimed",
  },
  "giveaway": {
    name: "Giveaway",
    description: "Open giveaway with no barriers. Shows remaining codes for urgency.",
    promo_headline: "Free Code Giveaway",
    promo_description: "We're giving away free codes while supplies last. Grab yours before they're gone!",
    cta_text: "Claim Prize",
    require_auth: false,
    show_social_proof: true,
    social_proof_style: "remaining",
  },
};

export const templateList = Object.entries(campaignTemplates).map(([id, template]) => ({
  id,
  ...template,
}));
