// A card's trip to its page and back. The gallery is gone while its page is open, so what the way
// home needs lives here: where the card was, and the spin of every row. In memory on purpose: after
// a reload there is nothing to fly back to.

export type Rect = { x: number; y: number; width: number; height: number };

export type Flight = {
  galleryPath: string;
  href: string;
  row: number;
  slot: number;
  spins: number[];
  /** The flattened card, in canvas pixels. */
  rect: Rect;
  poster: string;
  returning: boolean;
};

let flight: Flight | null = null;

export const startFlight = (next: Omit<Flight, "returning">) => {
  flight = { ...next, returning: false };
};

/** The gallery asks once on mount: did we just come back? */
export const takeReturn = (): Flight | null => {
  if (!flight?.returning) return null;
  const f = flight;
  flight = null;
  return f;
};

/** The page's main picture: covers come in a light and a dark cut, only one is on show. */
export const pageCover = () =>
  [...document.querySelectorAll<HTMLElement>("header img, header video")].find(
    (el) => el.getClientRects().length > 0,
  );

type Change = { fromLocation?: { pathname: string }; toLocation: { pathname: string } };

/**
 * The router's view transition hook. Every other navigation on the site stays as it is (false);
 * only Back from a card's own page becomes a transition, with the page's cover as the flying part.
 */
export const flightTransitionTypes = ({ fromLocation, toLocation }: Change): string[] | false => {
  if (!flight || toLocation.pathname !== flight.galleryPath) return false;
  if (fromLocation?.pathname !== flight.href) return false;
  const cover = pageCover();
  if (cover) cover.style.viewTransitionName = "work-card";
  flight.returning = true;
  return ["work-return"];
};
