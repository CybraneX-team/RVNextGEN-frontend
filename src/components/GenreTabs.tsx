"use client";

import { useState } from "react";

export function GenreTabs({ genres }: { genres: string[] }) {
  const [active, setActive] = useState(genres[0]);

  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto">
      {genres.map((genre) => {
        const isActive = genre === active;
        return (
          <button
            key={genre}
            type="button"
            onClick={() => setActive(genre)}
            className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive ? "bg-white text-black" : "bg-white/10 text-white/70 hover:bg-white/15"
            }`}
          >
            {genre}
          </button>
        );
      })}
    </div>
  );
}
