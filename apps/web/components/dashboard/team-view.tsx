// @ts-nocheck
"use client"

import { useState } from "react"
import { ShieldCheck, UserCheck, Plus, UserPlus, Mail } from "lucide-react"

interface Member {
  id: string
  name: string
  email: string
  role: "Admin" | "Developer" | "Viewer"
  status: "active" | "invited"
}

const mockMembers: Member[] = [
  { id: "1", name: "Om Humkekar", email: "odhumkekar@gmail.com", role: "Admin", status: "active" },
  { id: "2", name: "Sarah Connor", email: "sarah.c@initech.com", role: "Developer", status: "active" },
  { id: "3", name: "John Doe", email: "j.doe@globex.org", role: "Viewer", status: "invited" },
]

export function TeamView() {
  const [members, setMembers] = useState<Member[]>(mockMembers)
  const [emailInput, setEmailInput] = useState("")
  const [selectedRole, setSelectedRole] = useState<"Admin" | "Developer" | "Viewer">("Developer")

  const handleInvite = () => {
    if (!emailInput.trim()) return

    const newMem: Member = {
      id: String(members.length + 1),
      name: emailInput.split("@")[0] || "Invited Member",
      email: emailInput,
      role: selectedRole,
      status: "invited",
    }
    setMembers([...members, newMem])
    setEmailInput("")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Team Directory</h2>
          <p className="text-xs text-slate-400">Manage member privileges, roles, and access invitations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Member List */}
        <div className="lg:col-span-2 border border-white/5 rounded-2xl bg-slate-950/20 divide-y divide-white/5 overflow-hidden">
          <div className="p-4 bg-slate-950/40 grid grid-cols-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <div>Member</div>
            <div className="text-center">Role</div>
            <div className="text-right">Status</div>
          </div>

          {members.map((m) => (
            <div key={m.id} className="p-4 grid grid-cols-3 items-center text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-slate-200 block truncate">{m.name}</span>
                  <span className="text-[10px] text-slate-500 truncate block">{m.email}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-slate-300 font-medium">
                {m.role === "Admin" ? (
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                ) : (
                  <UserCheck className="w-4 h-4 text-blue-400" />
                )}
                <span>{m.role}</span>
              </div>

              <div className="text-right">
                <span
                  className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    m.status === "active"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Invite Block */}
        <div className="p-5 border border-white/5 rounded-2xl bg-slate-950/40 backdrop-blur-md space-y-4 h-fit">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <UserPlus className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-300">Invite Collaborator</h3>
          </div>

           <div className="space-y-3.5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full pl-3.5 pr-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="role" className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Select Role</label>
              <select
                id="role"
                title="Select Role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-200 focus:outline-none"
              >
                <option value="Admin">Admin</option>
                <option value="Developer">Developer</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>

            <button
              onClick={handleInvite}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/10 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Send Invitation
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
