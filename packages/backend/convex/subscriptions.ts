import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalAction } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Plan definitions
const PLANS = [
  {
    planId: "free",
    name: "Free",
    description: "Perfect for getting started with AI-powered support",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "1 seat",
      "50 conversations/month",
      "Basic AI responses",
      "Core knowledge base",
      "Community support"
    ],
    limits: {
      seats: 1,
      conversations: 50,
      aiMessages: 200,
      tokens: 100000,
      kbDocuments: 5,
      apiCalls: 1000,
      integrations: [],
      customDomain: false,
      sla: undefined
    },
    isPublic: true,
    order: 0
  },
  {
    planId: "pro",
    name: "Pro",
    description: "For growing teams that need more power",
    priceMonthly: 2900,
    priceYearly: 29000,
    features: [
      "5 seats",
      "Unlimited conversations",
      "Advanced AI with function calling",
      "Unlimited knowledge base",
      "Email support",
      "Slack integration",
      "Analytics dashboard",
      "Team collaboration tools"
    ],
    limits: {
      seats: 5,
      conversations: Infinity as any,
      aiMessages: 5000,
      tokens: 1000000,
      kbDocuments: 50,
      apiCalls: 10000,
      integrations: ["slack", "email"],
      customDomain: false,
      sla: "24h response"
    },
    isPublic: true,
    order: 1
  },
  {
    planId: "business",
    name: "Business",
    description: "For established businesses with serious needs",
    priceMonthly: 9900,
    priceYearly: 99000,
    features: [
      "20 seats",
      "Unlimited everything",
      "Priority AI models",
      "Custom integrations",
      "Custom domain",
      "Phone support",
      "SLA guarantee",
      "Advanced analytics",
      "Audit logs",
      "SSO authentication"
    ],
    limits: {
      seats: 20,
      conversations: Infinity as any,
      aiMessages: Infinity as any,
      tokens: Infinity as any,
      kbDocuments: Infinity as any,
      apiCalls: Infinity as any,
      integrations: ["slack", "email", "zapier", "api"],
      customDomain: true,
      sla: "12h response"
    },
    isPublic: true,
    order: 2
  },
  {
    planId: "enterprise",
    name: "Enterprise",
    description: "For large organizations with custom requirements",
    priceMonthly: 49900,
    priceYearly: 499000,
    features: [
      "Unlimited seats",
      "Everything in Business",
      "Custom AI model training",
      "On-premise deployment option",
      "Dedicated success manager",
      "Custom SLA",
      "White-labeling",
      "Custom development",
      "Priority support 24/7"
    ],
    limits: {
      seats: Infinity as any,
      conversations: Infinity as any,
      aiMessages: Infinity as any,
      tokens: Infinity as any,
      kbDocuments: Infinity as any,
      apiCalls: Infinity as any,
      integrations: [],
      customDomain: true,
      sla: "Custom SLA"
    },
    isPublic: true,
    order: 3
  }
];

// Initialize plans (call this once)
export const initializePlans = mutation({
  args: {},
  handler: async (ctx) => {
    for (const plan of PLANS) {
      const existing = await ctx.db
        .query("plans")
        .withIndex("by_plan_id", (q) => q.eq("planId", plan.planId))
        .first();
      
      if (!existing) {
        await ctx.db.insert("plans", plan);
      }
    }
  }
});

// Get all public plans
export const getPlans = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("plans")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .order("asc")
      .collect();
  }
});

// Get plan by ID
export const getPlan = query({
  args: { planId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("plans")
      .withIndex("by_plan_id", (q) => q.eq("planId", args.planId))
      .first();
  }
});

// Create a free subscription for an org
export const createFreeSubscription = mutation({
  args: { orgId: v.string(), userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .first();
    
    if (existing) {
      throw new Error("Organization already has a subscription");
    }

    const now = Date.now();
    const monthInMs = 30 * 24 * 60 * 60 * 1000;

    const subscriptionId = await ctx.db.insert("subscriptions", {
      orgId: args.orgId,
      userId: args.userId,
      planId: "free",
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: now + monthInMs,
      cancelAtPeriodEnd: false,
      startedAt: now,
      billingCycle: "monthly",
      quantity: 1
    });

    // Initialize usage metrics
    await initializeUsageMetering(ctx, args.orgId, "free");

    return subscriptionId;
  }
});

// Get subscription for an org
export const getSubscription = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .first();
  }
});

// Get subscription with plan details
export const getSubscriptionWithPlan = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .first();
    
    if (!subscription) {
      return null;
    }

    const plan = await ctx.db
      .query("plans")
      .withIndex("by_plan_id", (q) => q.eq("planId", subscription.planId))
      .first();

    return { subscription, plan };
  }
});

// Initialize usage metering
async function initializeUsageMetering(ctx: any, orgId: string, planId: string) {
  const plan = PLANS.find(p => p.planId === planId);
  if (!plan) return;

  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getTime();

  const metrics = [
    "conversations",
    "ai_messages",
    "tokens",
    "api_calls",
    "kb_documents",
    "seats"
  ];

  for (const metric of metrics) {
    let limit: number | undefined;
    switch (metric) {
      case "conversations": limit = plan.limits.conversations; break;
      case "ai_messages": limit = plan.limits.aiMessages; break;
      case "tokens": limit = plan.limits.tokens; break;
      case "api_calls": limit = plan.limits.apiCalls; break;
      case "kb_documents": limit = plan.limits.kbDocuments; break;
      case "seats": limit = plan.limits.seats; break;
    }

    await ctx.db.insert("usage_metering", {
      orgId,
      date: today,
      metric,
      usage: 0,
      limit,
      resetAt: monthEnd
    });
  }
}

// Increment usage metric
export const incrementUsage = mutation({
  args: { orgId: v.string(), metric: v.string(), amount: v.number() },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split('T')[0];
    
    const existing = await ctx.db
      .query("usage_metering")
      .withIndex("by_org_metric_date", (q) => 
        q.eq("orgId", args.orgId).eq("metric", args.metric).eq("date", today)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        usage: existing.usage + args.amount
      });
    } else {
      const subscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
        .first();
      
      const plan = subscription ? PLANS.find(p => p.planId === subscription.planId) : null;
      let limit: number | undefined;
      
      if (plan) {
        switch (args.metric) {
          case "conversations": limit = plan.limits.conversations; break;
          case "ai_messages": limit = plan.limits.aiMessages; break;
          case "tokens": limit = plan.limits.tokens; break;
          case "api_calls": limit = plan.limits.apiCalls; break;
          case "kb_documents": limit = plan.limits.kbDocuments; break;
          case "seats": limit = plan.limits.seats; break;
        }
      }

      const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getTime();
      
      await ctx.db.insert("usage_metering", {
        orgId: args.orgId,
        date: today,
        metric: args.metric,
        usage: args.amount,
        limit,
        resetAt: monthEnd
      });
    }
  }
});

// Get current usage for an org
export const getUsage = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split('T')[0];
    
    const usageRecords = await ctx.db
      .query("usage_metering")
      .withIndex("by_org_date", (q) => 
        q.eq("orgId", args.orgId).eq("date", today)
      )
      .collect();

    return usageRecords;
  }
});

// Check if feature is enabled
export const isFeatureEnabled = query({
  args: { orgId: v.string(), featureKey: v.string() },
  handler: async (ctx, args) => {
    // First check feature flags
    const flag = await ctx.db
      .query("feature_flags")
      .withIndex("by_org_feature", (q) => 
        q.eq("orgId", args.orgId).eq("featureKey", args.featureKey)
      )
      .first();

    if (flag) {
      if (flag.expiresAt && Date.now() > flag.expiresAt) {
        return false;
      }
      return flag.enabled;
    }

    // Fall back to plan features
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .first();

    if (!subscription) {
      return false;
    }

    const plan = PLANS.find(p => p.planId === subscription.planId);
    if (!plan) {
      return false;
    }

    // Check if feature is in plan features
    const featureLower = args.featureKey.toLowerCase();
    return plan.features.some(f => 
      f.toLowerCase().includes(featureLower) ||
      featureLower.includes(f.toLowerCase().split(' ')[0])
    );
  }
});

// Set a feature flag
export const setFeatureFlag = mutation({
  args: {
    orgId: v.optional(v.string()),
    userId: v.optional(v.string()),
    featureKey: v.string(),
    value: v.union(v.boolean(), v.string(), v.number()),
    enabled: v.boolean(),
    description: v.optional(v.string()),
    expiresAt: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const existing = args.orgId 
      ? await ctx.db.query("feature_flags")
          .withIndex("by_org_feature", (q) => 
            q.eq("orgId", args.orgId!).eq("featureKey", args.featureKey)
          ).first()
      : args.userId
        ? await ctx.db.query("feature_flags")
            .withIndex("by_user_feature", (q) => 
              q.eq("userId", args.userId!).eq("featureKey", args.featureKey)
            ).first()
        : await ctx.db.query("feature_flags")
            .withIndex("by_feature", (q) => q.eq("featureKey", args.featureKey))
            .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now
      });
    } else {
      await ctx.db.insert("feature_flags", {
        ...args,
        createdAt: now,
        updatedAt: now
      });
    }
  }
});

// Create a coupon
export const createCoupon = mutation({
  args: {
    orgId: v.optional(v.string()),
    code: v.string(),
    name: v.string(),
    type: v.union(v.literal("percentage"), v.literal("fixed_amount")),
    amountOff: v.optional(v.number()),
    percentOff: v.optional(v.number()),
    currency: v.optional(v.string()),
    duration: v.union(v.literal("once"), v.literal("repeating"), v.literal("forever")),
    durationInMonths: v.optional(v.number()),
    maxRedemptions: v.optional(v.number()),
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    appliesToPlans: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const couponId = await ctx.db.insert("coupons", {
      ...args,
      timesRedeemed: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now
    });
    return couponId;
  }
});

// Validate and redeem a coupon
export const redeemCoupon = mutation({
  args: { code: v.string(), orgId: v.string() },
  handler: async (ctx, args) => {
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!coupon) {
      throw new Error("Invalid coupon code");
    }

    if (!coupon.isActive) {
      throw new Error("Coupon is not active");
    }

    const now = Date.now();
    if (coupon.validFrom && now < coupon.validFrom) {
      throw new Error("Coupon is not yet valid");
    }
    if (coupon.validUntil && now > coupon.validUntil) {
      throw new Error("Coupon has expired");
    }

    if (coupon.maxRedemptions && coupon.timesRedeemed >= coupon.maxRedemptions) {
      throw new Error("Coupon has reached maximum redemptions");
    }

    // Increment redemption count
    await ctx.db.patch(coupon._id, {
      timesRedeemed: coupon.timesRedeemed + 1,
      updatedAt: now
    });

    return coupon;
  }
});

// Add a seat
export const addSeat = mutation({
  args: { orgId: v.string(), userId: v.string(), email: v.string(), name: v.optional(v.string()), role: v.union(v.literal("admin"), v.literal("agent"), v.literal("viewer")) },
  handler: async (ctx, args) => {
    // Check seat limit
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .first();

    if (!subscription) {
      throw new Error("No subscription found");
    }

    const plan = PLANS.find(p => p.planId === subscription.planId);
    if (!plan) {
      throw new Error("Invalid plan");
    }

    const currentSeats = await ctx.db
      .query("seats")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .collect();

    const activeSeats = currentSeats.filter(s => s.status === "active").length;

    if (plan.limits.seats !== Infinity && activeSeats >= plan.limits.seats) {
      throw new Error("Seat limit reached. Please upgrade your plan.");
    }

    // Check if seat already exists
    const existingSeat = await ctx.db
      .query("seats")
      .withIndex("by_org_user", (q) => 
        q.eq("orgId", args.orgId).eq("userId", args.userId)
      )
      .first();

    if (existingSeat) {
      await ctx.db.patch(existingSeat._id, {
        status: "active",
        lastActiveAt: Date.now()
      });
      return existingSeat._id;
    }

    const seatId = await ctx.db.insert("seats", {
      orgId: args.orgId,
      userId: args.userId,
      email: args.email,
      name: args.name,
      role: args.role,
      status: "active",
      invitedAt: Date.now(),
      joinedAt: Date.now()
    });

    // Increment seat usage
    await incrementUsage(ctx, { orgId: args.orgId, metric: "seats", amount: 1 });

    return seatId;
  }
});

// Get seats for an org
export const getSeats = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("seats")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .collect();
  }
});

// Get invoices for an org
export const getInvoices = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invoices")
      .withIndex("by_org_date", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
  }
});

// Cancel subscription
export const cancelSubscription = mutation({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .first();

    if (!subscription) {
      throw new Error("No subscription found");
    }

    await ctx.db.patch(subscription._id, {
      cancelAtPeriodEnd: true
    });

    return subscription._id;
  }
});

// Reactivate subscription
export const reactivateSubscription = mutation({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .first();

    if (!subscription) {
      throw new Error("No subscription found");
    }

    await ctx.db.patch(subscription._id, {
      cancelAtPeriodEnd: false
    });

    return subscription._id;
  }
});

// --- Stripe Integration Placeholders ---

// Create Stripe checkout session
export const createCheckoutSession = action({
  args: { orgId: v.string(), planId: v.string(), billingCycle: v.union(v.literal("monthly"), v.literal("yearly")), successUrl: v.string(), cancelUrl: v.string() },
  handler: async (ctx, args) => {
    // TODO: Implement actual Stripe integration
    // This is a placeholder that would:
    // 1. Get Stripe price ID from the plan
    // 2. Create a Stripe Checkout Session
    // 3. Return the session URL
    console.log("Creating checkout session", args);
    return {
      sessionId: "cs_test_placeholder",
      url: "https://checkout.stripe.com/placeholder"
    };
  }
});

// Create Stripe customer portal
export const createCustomerPortal = action({
  args: { orgId: v.string(), returnUrl: v.string() },
  handler: async (ctx, args) => {
    // TODO: Implement Stripe customer portal
    console.log("Creating customer portal", args);
    return {
      url: "https://billing.stripe.com/placeholder"
    };
  }
});

// Handle Stripe webhook (internal)
export const handleStripeWebhook = internalAction({
  args: { event: v.any() },
  handler: async (ctx, args) => {
    // TODO: Implement webhook handling for:
    // - checkout.session.completed
    // - invoice.paid
    // - customer.subscription.updated
    // - customer.subscription.deleted
    console.log("Handling Stripe webhook", args.event.type);
  }
});

// Record Stripe event
export const recordStripeEvent = mutation({
  args: { stripeEventId: v.string(), type: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    // Check if we already processed this event
    const existing = await ctx.db
      .query("stripe_events")
      .withIndex("by_stripe_event_id", (q) => q.eq("stripeEventId", args.stripeEventId))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("stripe_events", {
      stripeEventId: args.stripeEventId,
      type: args.type,
      data: args.data,
      processed: false,
      createdAt: Date.now()
    });
  }
});

// --- End Stripe Placeholders ---