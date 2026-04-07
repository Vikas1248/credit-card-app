export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold">You are offline</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Please check your internet connection and try again. Previously cached
          pages may still be available.
        </p>
      </div>
    </main>
  );
}
