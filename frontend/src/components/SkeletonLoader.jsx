/**
 * Glass-styled skeleton loading placeholders.
 * Usage: <SkeletonLoader variant="card" /> or <SkeletonLoader variant="list-item" count={5} />
 */

const variants = {
  "text-sm": "h-3 w-24 rounded",
  "text-md": "h-4 w-40 rounded",
  "text-lg": "h-5 w-56 rounded",
  "text-full": "h-3 w-full rounded",
  image: "h-40 w-full rounded-lg",
  card: "h-28 w-full rounded-glass",
  "list-item": "h-16 w-full rounded-lg",
  badge: "h-5 w-16 rounded-full",
  circle: "h-8 w-8 rounded-full",
};

export default function SkeletonLoader({ variant = "text-md", count = 1, className = "" }) {
  const baseClass = variants[variant] || variants["text-md"];

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`skeleton ${baseClass} ${className}`}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

/** Pre-composed skeleton layouts */
export function BridgeListSkeleton({ count = 6 }) {
  return (
    <div className="flex flex-col gap-1 p-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-3 rounded-lg"
          style={{ opacity: 1 - i * 0.12 }}
        >
          <div className="skeleton w-1 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="skeleton h-3.5 w-3/4 rounded" />
            <div className="flex gap-2">
              <div className="skeleton h-3 w-16 rounded" />
              <div className="skeleton h-3 w-12 rounded" />
            </div>
          </div>
          <div className="skeleton h-5 w-14 rounded-full flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function BridgeDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <div className="skeleton h-6 w-20 rounded-full" />
        <div className="skeleton h-4 w-32 rounded" />
      </div>
      <div className="skeleton h-40 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-14 rounded-lg" />
        <div className="skeleton h-14 rounded-lg" />
        <div className="skeleton h-14 rounded-lg" />
        <div className="skeleton h-14 rounded-lg" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="skeleton h-3.5 w-full rounded" />
        <div className="skeleton h-3.5 w-5/6 rounded" />
        <div className="skeleton h-3.5 w-4/6 rounded" />
      </div>
    </div>
  );
}
