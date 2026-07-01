import Link from 'next/link';

interface StatePanelProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function StatePanel({
  title,
  description,
  actionLabel = 'Voltar',
  actionHref = '/',
  onAction,
}: StatePanelProps) {
  const content = (
    <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-8 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.25)] backdrop-blur-xl">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600">
        <span className="text-xl font-semibold">✦</span>
      </div>
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {actionLabel}
          </button>
        ) : (
          <Link
            href={actionHref}
            className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {actionLabel}
          </Link>
        )}
      </div>
    </div>
  );

  return content;
}
