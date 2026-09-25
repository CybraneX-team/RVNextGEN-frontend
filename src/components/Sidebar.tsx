"use client";

import { useState } from "react";
import { HomeIcon, LibraryIcon, SearchIcon } from "./icons";

const navItems = [
  { label: "Home", icon: HomeIcon },
  { label: "Search", icon: SearchIcon },
  { label: "Library", icon: LibraryIcon },
] as const;

export function Sidebar() {
  const [active, setActive] = useState<string>("Home");

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-20 flex-col items-center border-r border-white/10 bg-black py-6 lg:flex xl:w-56 xl:items-stretch xl:px-4">
      <div className="mb-10 flex items-center justify-center xl:justify-start xl:px-2">
        <span className="text-xl font-black tracking-tight text-white">
          R<span className="text-rose-500">.</span>
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ label, icon: Icon }) => {
          const isActive = active === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setActive(label)}
              className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition xl:justify-start ${
                isActive ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/80"
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="hidden xl:inline">{label}</span>
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => setActive("Profile")}
        className="flex items-center justify-center gap-3 rounded-xl px-3 py-2 xl:justify-start"
      >
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-700 text-xs font-bold text-white">
          H
        </span>
        <span className="hidden text-sm font-medium text-white/70 xl:inline">Profile</span>
      </button>
    </aside>
  );
}
