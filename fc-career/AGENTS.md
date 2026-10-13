<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Career architecture
- Use TanStack file routes for the career hub and each major game view; the shared shell and game provider live in the root layout to preserve state across navigation.
- Keep browser-safe career domain rules in `src/features/career/game.ts` separate from presentation so progression, fixtures and serialization can be tested independently.
- Persist this single-player career on the device with versioned checksum-validated local storage, as explicitly required by the supplied architecture; do not present it as account authentication.
- Define visual roles and motion timing in global semantic CSS tokens; use design-system button variants for controls.
