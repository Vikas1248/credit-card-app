import { DetailFactTile } from "@/components/card-detail-tiles";

type Props = {
  reward_rate: string | null;
  lounge_access: string | null;
  best_for: string | null;
};

function RewardRateProgramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function LoungeProgramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 9a2 2 0 012-2h2.5a1 1 0 01.8.4l1.9 2.53a1 1 0 00.8.4H20a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V9z" />
      <path d="M6 15h.01M10 15h4" />
    </svg>
  );
}

function BestForProgramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L5 9h7l3-7z" />
    </svg>
  );
}

export function CardProgramDetails({ card }: { card: Props }) {
  return (
    <section
      className="mt-12 border-t border-zinc-100 pt-10 dark:border-zinc-800"
      aria-labelledby="card-program-details-heading"
    >
      <h2
        id="card-program-details-heading"
        className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
      >
        Program details
      </h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Issuer wording and perks from our catalog (same layout as key details).
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailFactTile
          icon={<RewardRateProgramIcon />}
          label="Reward rate"
          ringClassName="bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
        >
          {card.reward_rate?.trim() ? (
            <span className="whitespace-pre-wrap">{card.reward_rate}</span>
          ) : (
            <span className="text-zinc-500 dark:text-zinc-400">—</span>
          )}
        </DetailFactTile>
        <DetailFactTile
          icon={<LoungeProgramIcon />}
          label="Lounge access"
          ringClassName="bg-violet-600/10 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
        >
          {card.lounge_access?.trim() ? (
            <span className="whitespace-pre-wrap">{card.lounge_access}</span>
          ) : (
            <span className="text-zinc-500 dark:text-zinc-400">—</span>
          )}
        </DetailFactTile>
        <DetailFactTile
          icon={<BestForProgramIcon />}
          label="Best for"
          ringClassName="bg-amber-600/10 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
        >
          {card.best_for?.trim() ? (
            <span className="whitespace-pre-wrap">{card.best_for}</span>
          ) : (
            <span className="text-zinc-500 dark:text-zinc-400">—</span>
          )}
        </DetailFactTile>
      </div>
    </section>
  );
}
