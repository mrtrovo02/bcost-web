'use client';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto flex max-w-7xl animate-pulse flex-col gap-6">
        <div className="h-16 w-72 rounded-2xl bg-slate-200" />
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="h-72 rounded-[2rem] bg-slate-200" />
          <div className="h-72 rounded-[2rem] bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
