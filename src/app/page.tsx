export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
        Knowledge Base
      </h1>
      <p className="text-[var(--color-text-secondary)]">
        Knowledge Base — data layer ready
      </p>
      <p className="text-sm text-[var(--color-text-muted)]">
        Article list, search, and editing land in later iterations. Use{" "}
        <code className="rounded-[var(--radius-sm)] bg-[var(--color-bg-subtle)] px-1 font-mono text-sm">
          npm run db:seed
        </code>{" "}
        if you need sample data in Prisma Studio.
      </p>
    </div>
  );
}
