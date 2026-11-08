import { createRouter, createRouteMask } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";
import { flightTransitionTypes } from "./components/work-gallery/flight";

const bookModalMask = createRouteMask({
  routeTree,
  from: "/feed/b/$bookId/modal",
  to: "/feed/b/$bookId",
  params: (prev) => ({ bookId: prev.bookId }),
});

// Create a new router instance
export const getRouter = () => {
  const router = createRouter({
    routeTree,
    routeMasks: [bookModalMask],
    scrollRestoration: true,
    // Off for every navigation except Back from a gallery card's page (it returns false for the rest).
    defaultViewTransition: { types: flightTransitionTypes },
    defaultPreloadStaleTime: 0,
  });

  return router;
};
