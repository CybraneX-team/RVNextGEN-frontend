export const GYRO_SERIES = [
  { id: "desert", title: "A bond beyond words.", lead: "A bond", emphasis: "beyond", end: "words.", description: "A quiet journey across the desert brings an unexpected bond to life.", historyKey: "gyro-desert-recent-episodes" },
  { id: "camel", title: "Beyond the dunes.", lead: "Beyond", emphasis: "the", end: "dunes.", description: "Across shifting sands, a lone traveller follows the light of a restless sky.", historyKey: "gyro-camel-recent-episodes" },
] as const;

export function SeriesArtwork({ index, tilt = { x: 0, y: 0 }, focus = 0, drift = 0, motion = 1 }: { index: number; tilt?: { x: number; y: number }; focus?: number; drift?: number; motion?: number }) {
  if (index === 1) return <div aria-hidden="true" className="absolute inset-0 isolate overflow-hidden bg-[#9a8998]">
    <div className="absolute inset-[-40px] bg-cover bg-[position:60%_top]" style={{ backgroundImage: "url('/images/sky.jpeg')", transform: `translate3d(${-tilt.x * .4 * drift}px,${-tilt.y * .4 * drift}px,0) scale(${1.08 + focus * .12})`, filter: `blur(${focus * 5 * motion}px)` }} />
    <div className="absolute inset-x-[-40px] top-[28%] bottom-[-40px] bg-cover bg-center [mask-image:linear-gradient(to_bottom,transparent,black_25%)]" style={{ backgroundImage: "url('/images/dunes_bg.jpeg')", transform: `translate3d(${-tilt.x * .75 * drift}px,${-tilt.y * .6 * drift}px,0) scale(${1.05 + focus * .14})`, filter: `blur(${focus * 3 * motion}px)` }} />
    <div className="absolute inset-x-[-35px] top-[8%] bottom-[-25px] bg-cover bg-[position:27%_bottom] mix-blend-multiply" style={{ backgroundImage: "url('/images/camel_foreground.jpeg')", transform: `translate3d(${tilt.x * 1.3 * drift}px,${tilt.y * drift}px,0) scale(${1.03 + focus * .05})` }} />
  </div>;
  return <>
    <div aria-hidden="true" className="absolute inset-[-48px] bg-cover bg-[position:58%_center] will-change-transform motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out" style={{ backgroundImage: "url('/images/distant-desert.png')", transform: `translate3d(${-tilt.x * .7 * drift}px,${-tilt.y * .7 * drift}px,0) scale(${1.06 + focus * .24 * motion})`, filter: `blur(${focus * 13 * motion}px)` }} />
    <div aria-hidden="true" className="absolute inset-[-50px] scale-80 origin-bottom bg-cover bg-[position:10%_bottom] will-change-transform motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out sm:bg-[position:center_bottom]" style={{ backgroundImage: "url('/images/foreground-dune.png')", transform: `translate3d(${tilt.x * 1.25 * drift}px,${tilt.y * drift + focus * 28 * motion}px,0) scale(${1.04 + focus * .07 * motion})` }} />
  </>;
}
