import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/scratchpad")({
  component: RouteComponent,
});

function RouteComponent() {
  const [index, setIndex] = React.useState(0);

  const createCircularArray = (currentIndex: number, siblings: number = 2) => {
    const min = 0;
    const max = 8;

    return [
      ...Array.from({ length: siblings })
        .fill(null)
        .map((_, i) => {
          const n = currentIndex - (siblings - i);
          if (n >= min) return n;
          else return max + n + 1;
        }),
      currentIndex,
      ...Array.from({ length: siblings })
        .fill(null)
        .map((_, i) => {
          const n = currentIndex + (1 + i);
          if (n <= max) return n;
          else return (n % max) - 1;
        }),
    ];
  };

  React.useEffect(() => {
    const ac = new AbortController();
    window.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "ArrowLeft") {
          setIndex((prev) => (prev - 1 < 0 ? 8 : prev - 1));
        } else if (e.key === "ArrowRight") {
          setIndex((prev) => (prev + 1 > 8 ? 0 : prev + 1));
        }
      },
      {
        signal: ac.signal,
      },
    );

    return () => ac.abort();
  }, []);

  const array = createCircularArray(index);
  console.log({ array });

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="grid overflow-clip">
        {array.map((num, i) => {
          const difference = 2 - i;

          return (
            <span
              key={num}
              style={{
                transform: `translateY(${100 * difference}%)`,
              }}
              // className="absolute w-fit duration-300 transition-transform"
              className="col-start-1 row-start-1 duration-300 transition-transform w-max text-center"
            >
              Hello{num}
            </span>
          );
        })}
      </div>
    </div>
  );
}
