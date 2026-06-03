// src/features/marketing/components/MarketingPlaceholder.tsx
export function MarketingPlaceholder({ title, planned }: { title: string; planned: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-10 text-center">
      <div className="mb-2 text-3xl">🔶</div>
      <h1 className="mb-1 text-lg font-bold text-gray-700">{title}</h1>
      <p className="mb-3 inline-block rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-700">
        준비 중
      </p>
      <p className="max-w-md text-sm text-gray-500">{planned}</p>
    </div>
  );
}
