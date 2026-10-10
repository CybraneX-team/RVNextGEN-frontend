export const GYRO_SERIES = [
  { id: "desert", title: "A bond beyond words.", lead: "A bond", emphasis: "beyond", end: "words.", description: "A quiet journey across the desert brings an unexpected bond to life.", historyKey: "gyro-desert-recent-episodes" },
  { id: "camel", title: "Beyond the dunes.", lead: "Beyond", emphasis: "the", end: "dunes.", description: "Across shifting sands, a lone traveller follows the light of a restless sky.", historyKey: "gyro-camel-recent-episodes" },
] as const;

export function SeriesArtwork({ index, tilt = { x: 0, y: 0 }, focus = 0, drift = 0, motion = 1, gyro = false }: { index: number; tilt?: { x: number; y: number }; focus?: number; drift?: number; motion?: number; gyro?: boolean }) {
  const x = (amount: number) => gyro ? `calc(var(--gyro-x, 0px) * ${amount * drift})` : `${tilt.x * amount * drift}px`;
  const y = (amount: number, offset = 0) => gyro ? `calc(var(--gyro-y, 0px) * ${amount * drift} + ${offset}px)` : `${tilt.y * amount * drift + offset}px`;
  if (index === 1) return <div aria-hidden="true" className="absolute inset-0 isolate overflow-hidden bg-[#9a8998]">
    <div className="absolute inset-[-40px] bg-cover bg-[position:60%_top]" style={{ backgroundImage: "url('/images/sky.jpeg')", transform: `translate3d(${x(-.4)},${y(-.4)},0) scale(${1.08 + focus * .12})`, filter: `blur(${focus * 5 * motion}px)` }} />
    <div className="absolute inset-x-[-40px] top-[28%] bottom-[-40px] bg-cover bg-center [mask-image:linear-gradient(to_bottom,transparent,black_25%)]" style={{ backgroundImage: "url('/images/dunes_bg.jpeg')", transform: `translate3d(${x(-.75)},${y(-.6)},0) scale(${1.05 + focus * .14})`, filter: `blur(${focus * 3 * motion}px)` }} />
    <div className="absolute inset-x-[-35px] top-[8%] bottom-[-25px] bg-cover bg-[position:27%_bottom] mix-blend-multiply" style={{ backgroundImage: "url('/images/camel_foreground.jpeg')", transform: `translate3d(${x(1.3)},${y(1)},0) scale(${1.03 + focus * .05})` }} />
  </div>;
  return <>
    <div aria-hidden="true" className="absolute inset-[-48px] bg-cover bg-[position:58%_center] will-change-transform" style={{ backgroundImage: "url('/images/distant-desert.png')", transform: `translate3d(${x(-.7)},${y(-.7)},0) scale(${1.06 + focus * .24 * motion})`, filter: `blur(${focus * 13 * motion}px)` }} />
    <div aria-hidden="true" className="absolute inset-[-50px] scale-80 origin-bottom bg-cover bg-[position:10%_bottom] will-change-transform sm:bg-[position:center_bottom]" style={{ backgroundImage: "url('/images/foreground-dune.png')", transform: `translate3d(${x(1.25)},${y(1, focus * 28 * motion)},0) scale(${1.04 + focus * .07 * motion})` }} />
  </>;
}
