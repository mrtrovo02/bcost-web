interface LoadingShellProps {
  title?: string;
  description?: string;
}

export function LoadingShell({
  title = 'Carregando visão executiva',
  description = 'Estamos preparando os dados mais relevantes para você.',
}: LoadingShellProps) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-8 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.2)] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 animate-pulse rounded-full bg-blue-600" />
        <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
      </div>
      <div className="mt-6 space-y-3">
        <div className="h-8 w-2/3 animate-pulse rounded-full bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-100" />
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-[1.5rem] bg-slate-100" />
        ))}
      </div>
      <div className="mt-6 text-sm text-slate-500">
        <p className="font-medium text-slate-700">{title}</p>
        <p className="mt-1">{description}</p>
      </div>
    </div>
  );
}
