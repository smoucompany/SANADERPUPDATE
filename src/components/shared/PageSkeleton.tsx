// Skeleton that matches the shape of a real page — shows instantly with no network request

function Bone({ w = 'w-full', h = 'h-4', rounded = 'rounded' }: { w?: string; h?: string; rounded?: string }) {
  return <div className={`${w} ${h} ${rounded} bg-gray-200 animate-pulse`} />
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <Bone w="w-40" h="h-6" />
        <Bone w="w-24" h="h-8" rounded="rounded-lg" />
      </div>
      {/* filter bar */}
      <div className="px-6 py-3 border-b flex gap-3">
        <Bone w="w-48" h="h-9" rounded="rounded-lg" />
        <Bone w="w-32" h="h-9" rounded="rounded-lg" />
        <Bone w="w-32" h="h-9" rounded="rounded-lg" />
      </div>
      {/* rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-3 flex items-center gap-4">
            <Bone w="w-28" h="h-4" />
            <Bone w="w-20" h="h-4" />
            <Bone w="w-32" h="h-4" />
            <Bone w="w-16" h="h-4" />
            <div className="mr-auto"><Bone w="w-20" h="h-6" rounded="rounded-full" /></div>
          </div>
        ))}
      </div>
      {/* footer */}
      <div className="px-6 py-3 border-t bg-gray-50 flex gap-6">
        <Bone w="w-24" h="h-4" />
        <Bone w="w-24" h="h-4" />
        <Bone w="w-24" h="h-4" />
      </div>
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Bone w="w-20" h="h-3" />
              <Bone w="w-full" h="h-10" rounded="rounded-lg" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-3">
        <Bone w="w-32" h="h-5" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Bone w="w-full" h="h-10" rounded="rounded-lg" />
            <Bone w="w-24" h="h-10" rounded="rounded-lg" />
            <Bone w="w-24" h="h-10" rounded="rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-6">
      <div className={`grid grid-cols-2 md:grid-cols-${Math.min(count, 4)} gap-4`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-5 space-y-3">
            <Bone w="w-1/2" h="h-3" />
            <Bone w="w-3/4" h="h-8" />
            <Bone w="w-1/3" h="h-3" />
          </div>
        ))}
      </div>
      <TableSkeleton rows={5} />
    </div>
  )
}

// Default page skeleton — header + table
export default function PageSkeleton() {
  return (
    <div className="space-y-6" dir="rtl">
      {/* page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Bone w="w-40" h="h-7" />
          <Bone w="w-24" h="h-4" />
        </div>
        <div className="flex gap-2">
          <Bone w="w-28" h="h-9" rounded="rounded-lg" />
          <Bone w="w-32" h="h-9" rounded="rounded-lg" />
        </div>
      </div>
      <TableSkeleton rows={8} />
    </div>
  )
}
