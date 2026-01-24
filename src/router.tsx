import { createRouter, createRouteMask } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

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
    defaultPreloadStaleTime: 0,
  });

  return router;
};
