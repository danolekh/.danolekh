import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Size } from "motion-panels/react";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
} from "@tabler/icons-react";
import { Panel, PanelGroup, PanelSeparator } from "@/components/ui/motion-panels";

/* The wide-screen layouts, in motion-panels. `/m/<run>/<nick>` puts the nick big with the others
 * in a column beside it (resizable, collapsible, reordered by their grips); `/m/<run>` gives
 * everyone an equal tile, in as many rows as makes the tiles largest. A motion-panels group holds
 * one filling panel and at most one sized panel on each side of it, so a column or a grid is a
 * group nested in a panel. Tiles lean towards their neighbours, so a column of 16:9 videos reads
 * as one block instead of floating apart in tall panels. On a phone the page stacks them instead
 * (watch-page.tsx). */

export type Align = "start" | "center" | "end";

export interface TileControls {
  /** Folds this player's panel away; absent where it can't fold. */
  collapse?: () => void;
  x?: Align;
  y?: Align;
}

export type RenderTile = (name: string, big: boolean, controls: TileControls) => ReactNode;

interface RowItem {
  key: string;
  render: (controls: TileControls) => ReactNode;
}

const FOLD = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.25 },
} as const;

const percent = (share: number): `${number}%` => `${Number(share.toFixed(2))}%`;

/** Towards the neighbours: the first leans to the end, the last to the start. */
function lean(index: number, count: number): Align {
  if (count < 2) return "center";
  return index === 0 ? "end" : index === count - 1 ? "start" : "center";
}

/** Up to three panels on one axis. `fixedFill` never moves (the big player); without it, the
 *  middle of three (or the second of two) fills and the others trade places by their grips. */
function PanelRow({
  items,
  orientation = "horizontal",
  fixedFill,
  sideSize,
  minSize = 140,
  maxSize = "60%",
  cross = "center",
}: {
  items: RowItem[];
  orientation?: "horizontal" | "vertical";
  fixedFill?: string;
  sideSize: `${number}%`;
  minSize?: Size;
  maxSize?: Size;
  /** How the tiles lean on the other axis, from the row this one sits in. */
  cross?: Align;
}) {
  const keys = items.map((item) => item.key);
  const byKey = new Map(items.map((item) => [item.key, item]));
  const fill = fixedFill ?? (items.length === 3 ? keys[1]! : keys[keys.length - 1]!);
  // Two panels without a fixed one both move: the fill carries a value too, and keeps filling.
  const movable = keys.filter((key) => key !== fill || (!fixedFill && items.length === 2));
  const canReorder = movable.length === 2;

  const [order, setOrder] = useState(movable);
  const [sizes, setSizes] = useState<Record<string, `${number}%`>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // Players can join a live run: keep the viewer's order and append newcomers.
  const current = [
    ...order.filter((key) => movable.includes(key)),
    ...movable.filter((key) => !order.includes(key)),
  ];

  const along = (align: Align): TileControls =>
    orientation === "horizontal" ? { x: align, y: cross } : { x: cross, y: align };

  if (items.length === 1) {
    return <div className="size-full p-1">{items[0]!.render(along("center"))}</div>;
  }
  if (items.length > 3) {
    // Past what these layouts nest; real runs don't get here.
    return (
      <div className="grid size-full auto-rows-fr grid-cols-3 gap-2 p-1">
        {items.map((item) => (
          <div key={item.key} className="relative min-h-0">
            {item.render({})}
          </div>
        ))}
      </div>
    );
  }

  const sequence =
    items.length === 3
      ? [current[0]!, fill, current[1]!]
      : fixedFill
        ? [fill, current[0]!]
        : current;
  const visible = sequence.filter((key) => key === fill || !collapsed[key]);

  const panel = (key: string) => {
    const item = byKey.get(key)!;
    const controls = along(lean(visible.indexOf(key), visible.length));
    if (key === fill) {
      return (
        <Panel key={key} value={canReorder && movable.includes(key) ? key : undefined}>
          <div className="size-full p-1">{item.render(controls)}</div>
        </Panel>
      );
    }
    const collapse = () => setCollapsed((prev) => ({ ...prev, [key]: true }));
    return (
      <Panel
        key={key}
        value={canReorder ? key : undefined}
        size={sizes[key] ?? sideSize}
        defaultSize={sideSize}
        minSize={minSize}
        maxSize={maxSize}
        onSizeChange={(size: `${number}%`) => setSizes((prev) => ({ ...prev, [key]: size }))}
        collapsed={collapsed[key] ?? false}
        onCollapsedChange={(value: boolean) => setCollapsed((prev) => ({ ...prev, [key]: value }))}
        {...FOLD}
      >
        <div className="size-full p-1">{item.render({ ...controls, collapse })}</div>
      </Panel>
    );
  };

  const separator = (index: number) => {
    const before = sequence[index]!;
    const after = sequence[index + 1]!;
    const folded = [before, after].find((key) => key !== fill && collapsed[key]);
    const opensTowardsEnd = folded === before;
    const Icon =
      orientation === "horizontal"
        ? opensTowardsEnd
          ? IconChevronRight
          : IconChevronLeft
        : opensTowardsEnd
          ? IconChevronDown
          : IconChevronUp;
    return (
      <PanelSeparator key={`separator-${index}`} withHandle={!folded}>
        {folded && (
          <button
            type="button"
            aria-label="Show the hidden view"
            title="Show the hidden view"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setCollapsed((prev) => ({ ...prev, [folded]: false }))}
            className="absolute z-20 grid size-6 place-items-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground"
          >
            <Icon className="size-3.5" />
          </button>
        )}
      </PanelSeparator>
    );
  };

  const children: ReactNode[] = [];
  sequence.forEach((key, index) => {
    if (index > 0) children.push(separator(index - 1));
    children.push(panel(key));
  });

  return (
    <PanelGroup
      orientation={orientation}
      order={canReorder ? current : undefined}
      onOrderChange={canReorder ? (next: string[]) => setOrder(next) : undefined}
    >
      {children}
    </PanelGroup>
  );
}

function useSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1
          ? prev
          : { width, height },
      );
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

/** How many rows make `count` 16:9 tiles largest in a `width` × `height` stage. */
export function bestRows(count: number, width: number, height: number) {
  let best = 1;
  let bestWidth = 0;
  for (let rows = 1; rows <= Math.min(3, count); rows++) {
    const cols = Math.ceil(count / rows);
    const tile = Math.min(width / cols, ((height / rows) * 16) / 9);
    if (tile > bestWidth + 1) {
      best = rows;
      bestWidth = tile;
    }
  }
  return best;
}

export function PanelStage({
  names,
  focus,
  renderTile,
}: {
  names: string[];
  focus: string | null;
  renderTile: RenderTile;
}) {
  const [ref, size] = useSize();
  const tile = (name: string, big = false): RowItem => ({
    key: name,
    render: (controls) => renderTile(name, big, controls),
  });

  let layout: ReactNode = null;
  if (size.width > 0) {
    if (focus) {
      const others = names.filter((name) => name !== focus);
      const big = tile(focus, true);
      const column = (key: string, list: string[], cross: Align): RowItem => ({
        key,
        render: () => (
          <PanelRow
            orientation="vertical"
            items={list.map((name) => tile(name))}
            sideSize={percent(100 / list.length)}
            minSize={72}
            maxSize="80%"
            cross={cross}
          />
        ),
      });
      if (others.length === 0) {
        layout = <PanelRow items={[big]} sideSize="100%" />;
      } else if (others.length <= 3) {
        // Wide enough that the column's videos stack about as tall as the big one.
        const share = others.length === 1 ? 30 : others.length === 2 ? 26 : 22;
        layout = (
          <PanelRow
            items={[big, column("others", others, "start")]}
            fixedFill={focus}
            sideSize={percent(share)}
            minSize={160}
            maxSize="50%"
          />
        );
      } else {
        const half = Math.ceil(others.length / 2);
        layout = (
          <PanelRow
            items={[
              column("left", others.slice(0, half), "end"),
              big,
              column("right", others.slice(half), "start"),
            ]}
            fixedFill={focus}
            sideSize="20%"
            minSize={140}
            maxSize="34%"
          />
        );
      }
    } else {
      const tiles = names.map((name) => tile(name));
      const rowCount = bestRows(tiles.length, size.width, size.height);
      const perRow = Math.ceil(tiles.length / rowCount);
      const rows = Array.from({ length: rowCount }, (_, i) =>
        tiles.slice(i * perRow, (i + 1) * perRow),
      ).filter((row) => row.length > 0);
      layout =
        rows.length === 1 ? (
          <PanelRow items={tiles} sideSize={percent(100 / tiles.length)} maxSize="70%" />
        ) : (
          <PanelRow
            orientation="vertical"
            items={rows.map((row, i) => ({
              key: `row-${i}`,
              render: () => (
                <PanelRow
                  items={row}
                  sideSize={percent(100 / row.length)}
                  maxSize="70%"
                  cross={lean(i, rows.length)}
                />
              ),
            }))}
            sideSize={percent(100 / rows.length)}
            minSize={100}
            maxSize="75%"
          />
        );
    }
  }

  return (
    <div ref={ref} className="size-full">
      {layout}
    </div>
  );
}
