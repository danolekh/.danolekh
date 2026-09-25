// Two link previews side by side, as a chat app would show a shared URL. Used in posts that compare
// what a page shares as today with what it could share as.
type Card = {
  label: string;
  host: string;
  title: string;
  description: string;
  /** Share image path; without one the card shows a grey placeholder with this text. */
  image?: string;
  placeholder?: string;
};

export function LinkPreviewDemo({ cards = [] }: { cards?: Card[] }) {
  return (
    <div className="not-prose my-8 grid gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <figure key={card.label}>
          <figcaption className="mb-2 font-mono text-xs text-muted-foreground">
            {card.label}
          </figcaption>
          <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground">
            {card.image ? (
              <img
                src={card.image}
                width={1200}
                height={630}
                alt=""
                loading="lazy"
                className="aspect-[1200/630] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[1200/630] items-center justify-center bg-muted text-2xl font-semibold text-muted-foreground">
                {card.placeholder}
              </div>
            )}
            <div className="space-y-1 p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.host}</p>
              <p className="font-medium">{card.title}</p>
              <p className="text-muted-foreground">{card.description}</p>
            </div>
          </div>
        </figure>
      ))}
    </div>
  );
}
