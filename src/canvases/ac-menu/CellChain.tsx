import { Cell } from "./Cell";
import { degToRad, extrapolate } from "./utils";

interface CellChainProps {
  count: number;
  startPosition: [number, number, number];
  endPosition: [number, number, number];
  startRotation: number;
  endRotation: number;
  startSize?: number;
  endSize?: number;
  isRed?: boolean;
  positionModifier?: (
    i: number,
    count: number,
    basePos: [number, number, number],
  ) => [number, number, number];
}

export function CellChain({
  count,
  startPosition,
  endPosition,
  startRotation,
  endRotation,
  startSize = 2,
  endSize = 2,
  isRed = false,
  positionModifier,
}: CellChainProps) {
  return (
    <>
      {Array.from({ length: count + 1 }, (_, i) => {
        let position: [number, number, number] = [
          extrapolate(i, count, startPosition[0], endPosition[0]),
          extrapolate(i, count, startPosition[1], endPosition[1]),
          extrapolate(i, count, startPosition[2], endPosition[2]),
        ];

        if (positionModifier) {
          position = positionModifier(i, count, position);
        }

        return (
          <Cell
            key={i}
            size={extrapolate(i, count, startSize, endSize)}
            isRed={isRed}
            position={position}
            rotation={[
              0,
              0,
              degToRad(extrapolate(i, count, startRotation, endRotation)),
            ]}
          />
        );
      })}
    </>
  );
}
