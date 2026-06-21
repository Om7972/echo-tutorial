"use client"

import { CreditCard, ExternalLink, Calendar, Receipt } from "lucide-react"

export function BillingView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Billing & Subscriptions</h2>
          <p className="text-xs text-slate-400">Review subscription levels, usage limits, and transaction history</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Summary Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 border border-white/5 rounded-2xl bg-slate-950/40 backdrop-blur-md flex flex-col justify-between md:flex-row gap-4">
            <div className="space-y-3">
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                Active Plan
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Enterprise Voice Scale</h3>
                <p className="text-xs text-slate-500 mt-0.5">High capacity agent workflows for teams</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar className="w-4 h-4" />
                <span>Next billing cycle resets on Nov 19, 2026</span>
              </div>
            </div>

            <div className="flex flex-col justify-between items-start md:items-end self-stretch text-left md:text-right">
              <div>
                <span className="text-2xl font-bold text-slate-100">$249</span>
                <span className="text-xs text-slate-500"> / month</span>
              </div>
              <button className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold mt-4">
                <span>Manage in Stripe</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Usage Ratios */}
          <div className="p-5 border border-white/5 rounded-2xl bg-slate-950/20 space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Usage Meter</h4>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Total Call Minutes</span>
                  <span className="text-slate-400">12,420 / 25,000 mins</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: "50%" }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Connected AI Agents</span>
                  <span className="text-slate-400">3 / 10 agents</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-purple-500" style={{ width: "30%" }} />
                </div>
              </div>
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
            {[
              { id: "INV-39281", date: "Oct 19, 2026", amount: "$249.00" },
              { id: "INV-38291", date: "Sep 19, 2026", amount: "$249.00" },
              { id: "INV-37120", date: "Aug 19, 2026", amount: "$249.00" },
            ].map((inv) => (
              <div key={inv.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-200 block">{inv.id}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{inv.date}</span>
                </div>
                <span className="font-bold text-slate-200">{inv.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
