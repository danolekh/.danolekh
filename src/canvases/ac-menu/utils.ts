export const degToRad = (deg: number) => (Math.PI / 180) * deg;

export const extrapolate = (
  i: number,
  total: number,
  start: number,
  end: number,
) => {
  const delta = (end - start) / total;
  return start + delta * i;
};
