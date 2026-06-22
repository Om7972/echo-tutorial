"use client"

import { CreditCard, ExternalLink, Calendar, Receipt, ArrowRight, CheckCircle2, XCircle, ArrowUpRight, ShieldCheck, Zap, Users, MessageCircle, Database, Globe, Clock } from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import { useState } from "react"

// Format currency
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// Format date
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  })
}

export function BillingView() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [couponCode, setCouponCode] = useState("")
  const [showCoupon, setShowCoupon] = useState(false)

  // Mock orgId should be replaced with actual orgId from auth
  const orgId = "demo-org"

  const plans = useQuery(api.subscriptions.getPlans)
  const subscriptionData = useQuery(api.subscriptions.getSubscriptionWithPlan, { orgId })
  const usage = useQuery(api.subscriptions.getUsage, { orgId })
  const seats = useQuery(api.subscriptions.getSeats, { orgId })
  const invoices = useQuery(api.subscriptions.getInvoices, { orgId })

  const subscription = subscriptionData?.subscription
  const plan = subscriptionData?.plan

  const currentPlanId = subscription?.planId || "free"

  const isLoading = !plans || !subscriptionData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Billing & Subscriptions</h2>
          <p className="text-xs text-slate-400">Review subscription levels, usage limits, and transaction history</p>
        </div>
        {subscription && (
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border ${
              subscription.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
              subscription.status === "past_due" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
              "bg-slate-500/10 text-slate-400 border-slate-500/20"
            }`}>
              {subscription.status}
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-slate-900/40 rounded-2xl" />
          <div className="h-64 bg-slate-900/40 rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Plan Summary Card */}
            <div className="lg:col-span-2 space-y-6">
              {plan && subscription && (
              <div className="p-5 border border-white/5 rounded-2xl bg-slate-950/40 backdrop-blur-md flex flex-col justify-between md:flex-row gap-4">
                <div className="space-y-3">
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                    {plan.name}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">{plan.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-4 h-4" />
                    <span>Next billing: {formatDate(subscription.currentPeriodEnd)}</span>
                  </div>
                  {subscription.cancelAtPeriodEnd && (
                    <div className="text-[10px] text-amber-400 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      <span>Subscription will cancel at period end</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between items-start md:items-end self-stretch text-left md:text-right">
                  <div>
                    <span className="text-2xl font-bold text-slate-100">
                      {formatCurrency(billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly || plan.priceMonthly)}
                    </span>
                    <span className="text-xs text-slate-500"> / {billingCycle === "monthly" ? "month" : "year"}</span>
                  </div>
                  <div className="flex flex-col gap-2 mt-4">
                    <button className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold">
                      <span>Manage in Stripe</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    {!subscription.cancelAtPeriodEnd && (
                      <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 font-semibold">
                        <span>Cancel subscription</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              )}

              {/* Usage Ratios */}
              <div className="p-5 border border-white/5 rounded-2xl bg-slate-950/20 space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Usage Meter</h4>
                <div className="space-y-4">
                  {usage && usage.length > 0 ? (
                    usage.map((metric) => (
                      <div key={metric._id} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-300 capitalize">{metric.metric.replace("_", " ")}</span>
                          <span className="text-slate-400">
                            {metric.usage.toLocaleString()} / {metric.limit === Infinity ? "∞" : metric.limit?.toLocaleString() || "∞"}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              metric.limit && metric.limit !== Infinity 
                                ? (metric.usage / metric.limit) > 0.9 
                                  ? "bg-red-500" 
                                  : (metric.usage / metric.limit) > 0.7 
                                    ? "bg-amber-500" 
                                    : "bg-blue-500"
                                : "bg-blue-500"
                            }`} 
                            style={{ 
                              width: metric.limit && metric.limit !== Infinity 
                                ? `${Math.min((metric.usage / metric.limit), 1) * 100}%`
                                : "30%" 
                            }} 
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400">No usage data available</div>
                  )}
                </div>
              </div>

              {/* Seats */}
              <div className="p-5 border border-white/5 rounded-2xl bg-slate-950/20 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Team Seats</h4>
                  <button className="text-xs text-blue-400 hover:text-blue-300 font-semibold">
                    + Invite member
                  </button>
                </div>
                <div className="divide-y divide-white/5">
                  {seats && seats.length > 0 ? (
                    seats.map((seat) => (
                      <div key={seat._id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                            {(seat.name || seat.email).charAt(0).toUpperCase()}
                          </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-200 block">{seat.name || seat.email}</span>
                          <span className="text-[10px] text-slate-500 block">{seat.role}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${
                        seat.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"
                      }`}>
                        {seat.status}
                      </span>
                    </div>
                    ))
                  ) : (
                    <div className="py-3 text-xs text-slate-400">No seats found</div>
                  )}
                </div>
              </div>
            </div>

            {/* Invoice logs */}
            <div className="p-5 border border-white/5 rounded-2xl bg-slate-950/40 backdrop-blur-md space-y-4 h-fit">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Receipt className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs uppercase font-bold tracking-wider text-slate-300">Recent Invoices</h3>
              </div>

              <div className="divide-y divide-white/5">
                {invoices && invoices.length > 0 ? (
                  invoices.map((invoice) => (
                    <div key={invoice._id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-200 block">{invoice.stripeInvoiceNumber || invoice._id}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{formatDate(invoice.createdAt)}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-bold text-slate-200">{formatCurrency(invoice.amountPaid)}</span>
                        {invoice.invoicePdf && (
                          <a href={invoice.invoicePdf} target="_blank" className="text-[10px] text-blue-400 hover:text-blue-300">
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-xs text-slate-400">No invoices yet</div>
                )}
              </div>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100">Available Plans</h3>
              <div className="flex items-center gap-2 bg-slate-900/50 rounded-xl p-1">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg transition-all ${
                    billingCycle === "monthly" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle("yearly")}
                  className={`text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg transition-all ${
                    billingCycle === "yearly" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Yearly
                  <span className="ml-1 text-emerald-400 text-[8px]">(Save 20%)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans?.map((p) => (
                <div
                  key={p.planId}
                  className={`p-5 rounded-2xl border transition-all ${
                    p.planId === currentPlanId
                      ? "border-blue-500/50 bg-blue-500/5"
                      : "border-white/5 bg-slate-950/40 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-slate-100">{p.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-1">{p.description}</p>
                    </div>
                    {p.planId === currentPlanId && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>

                  <div className="mb-4">
                    <span className="text-2xl font-bold text-slate-100">
                      {p.priceMonthly === 0 ? "Free" : formatCurrency(billingCycle === "monthly" ? p.priceMonthly : p.priceYearly || p.priceMonthly)}
                    </span>
                    {p.priceMonthly > 0 && (
                      <span className="text-xs text-slate-500 ml-1">/ {billingCycle === "monthly" ? "mo" : "yr"}</span>
                    )}
                  </div>

                  <ul className="space-y-2 mb-4">
                    {p.features.slice(0, 5).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => setSelectedPlan(p.planId)}
                    disabled={p.planId === currentPlanId}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      p.planId === currentPlanId
                        ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-500 text-white hover:shadow-lg hover:shadow-blue-500/25"
                    }`}
                  >
                    {p.planId === currentPlanId ? "Current Plan" : p.priceMonthly === 0 ? "Downgrade" : "Upgrade"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Upgrade Modal Placeholder */}
      {selectedPlan && selectedPlan !== currentPlanId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Upgrade to {plans?.find(p => p.planId === selectedPlan)?.name}</h3>
                <p className="text-xs text-slate-400 mt-1">Complete your upgrade</p>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-slate-400 hover:text-white"
                aria-label="Close upgrade modal"
                title="Close"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {showCoupon && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Coupon code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      placeholder="Enter coupon code"
                    />
                    <button className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl">
                      Apply
                    </button>
                  </div>
                </div>
              )}
              {!showCoupon && (
                <button
                  onClick={() => setShowCoupon(true)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Have a coupon code?
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedPlan(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Cancel
              </button>
              <button className="flex-1 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white">
                Continue to checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
