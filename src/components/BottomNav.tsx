"use client";

import { useState } from "react";
import { HomeIcon, LibraryIcon, SearchIcon } from "./icons";

const navItems = [
  { label: "Home", icon: HomeIcon },
  { label: "Search", icon: SearchIcon },
  { label: "Library", icon: LibraryIcon },
] as const;

export function BottomNav() {
  const [active, setActive] = useState<string>("Home");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/90 backdrop-blur-lg lg:hidden">
      <div className="flex items-center justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {navItems.map(({ label, icon: Icon }) => {
          const isActive = active === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setActive(label)}
              className="flex flex-col items-center gap-1 px-3 py-1"
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-white/40"}`} />
              <span className={`text-[11px] ${isActive ? "text-white" : "text-white/40"}`}>{label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setActive("Profile")}
          className="flex flex-col items-center gap-1 px-3 py-1"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-700 text-[11px] font-bold text-white">
            H
          </span>
          <span className={`text-[11px] ${active === "Profile" ? "text-white" : "text-white/40"}`}>Profile</span>
        </button>
      </div>
    </nav>
  );
}
