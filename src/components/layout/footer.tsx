/**
 * The minimal `contentinfo` landmark the shell renders (design-spec.md §9.2's focus
 * order step 5, §9.4's "exactly one `contentinfo`").
 *
 * It carries no links of its own: the spec's "Keyboard shortcuts" dialog is out of
 * v1 scope (there is no shortcut reference to show until iteration 5's ⌘K palette
 * lands), and a footer link that opens nothing would be a dead end — which §3.1's
 * exit-set table forbids.
 */
export function Footer() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Team Knowledge Base';

  return (
    <footer className="border-divider text-ink-subtle mt-16 border-t px-4 py-6 text-[12px] md:px-6">
      {appName}
    </footer>
  );
}
