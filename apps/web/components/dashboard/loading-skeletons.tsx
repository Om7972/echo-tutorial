import { Skeleton } from "@workspace/ui/components/skeleton"

export function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-[150px]" />
        <Skeleton className="h-8 w-[100px]" />
      </div>
      <div className="border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5 bg-slate-950/20">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-3.5 w-[80px]" />
              </div>
            </div>
            <Skeleton className="h-6 w-[60px] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((n) => (
        <div key={n} className="p-6 rounded-2xl border border-white/5 bg-slate-950/40 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-[120px]" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-10 w-[60px]" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[80%]" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-[500px] border border-white/5 rounded-2xl bg-slate-950/20 overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-3.5 w-[60px]" />
          </div>
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        <div className="flex gap-3 max-w-[70%]">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <Skeleton className="h-12 w-full rounded-2xl rounded-tl-none" />
        </div>
        <div className="flex gap-3 max-w-[70%] ml-auto flex-row-reverse">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <Skeleton className="h-16 w-full rounded-2xl rounded-tr-none" />
        </div>
        <div className="flex gap-3 max-w-[70%]">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <Skeleton className="h-10 w-full rounded-2xl rounded-tl-none" />
        </div>
      </div>
      <div className="p-4 border-t border-white/5 flex gap-3 bg-slate-950/40">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </div>
  )
}
