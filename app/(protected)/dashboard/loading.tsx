import { Skeleton } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between pt-1">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-7 w-44" />
        </div>
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>

      {/* Macro rings */}
      <Skeleton className="h-52 w-full rounded-2xl" />

      {/* Progress bar */}
      <Skeleton className="h-20 w-full rounded-2xl" />

      {/* Meals */}
      <Skeleton className="h-44 w-full rounded-2xl" />

      {/* Training */}
      <Skeleton className="h-36 w-full rounded-2xl" />
    </div>
  );
}
