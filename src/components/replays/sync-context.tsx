import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import type { SyncGroup, SyncSnapshot } from "@/lib/replays/sync";

export const SyncContext = createContext<SyncGroup | null>(null);

export function useSync() {
  const group = useContext(SyncContext);
  if (!group) throw new Error("useSync must be used inside the watch page");
  return group;
}

/** A slice of the group's state; `select` should return something comparable with `===`. */
export function useSyncState<T>(select: (snapshot: SyncSnapshot) => T): T {
  const group = useSync();
  const get = () => select(group.getSnapshot());
  return useSyncExternalStore(group.subscribe, get, get);
}

/** Run time in seconds, refreshed every frame but re-rendering only when the tenth changes. */
export function useRunTime() {
  const group = useSync();
  const [time, setTime] = useState(() => group.time());
  useEffect(() => {
    let frame = 0;
    const loop = () => {
      const next = group.time();
      setTime((prev) => (Math.floor(prev * 10) === Math.floor(next * 10) ? prev : next));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [group]);
  return time;
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
