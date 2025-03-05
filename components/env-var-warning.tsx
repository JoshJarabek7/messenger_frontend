export function EnvVarWarning() {
  return (
    <div className="fixed left-0 right-0 bottom-0 flex flex-col border-t border-foreground/10 bg-background z-50">
      <div className="container flex flex-col items-center gap-2 px-8 py-4 md:flex-row">
        <p className="flex-1 text-center text-xs md:text-left text-foreground">
          <span className="font-bold">Warning:</span> Environment variables are not configured.
          Create a .env.local file to get started.
        </p>
        <a
          href="https://github.com/vercel/next.js/tree/canary/examples/with-supabase#getting-started"
          target="_blank"
          className="whitespace-nowrap text-xs font-bold text-foreground"
          rel="noreferrer"
        >
          Read Documentation
        </a>
      </div>
    </div>
  );
}
