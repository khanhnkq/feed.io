"use client";

import type { SystemNode } from "../types/architecture";

interface IsometricBoxNodeProps {
  node: SystemNode;
  isHighlighted: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export function IsometricBoxNode({
  node,
  isHighlighted,
  isSelected,
  onClick,
}: IsometricBoxNodeProps) {
  const Icon = node.icon;

  return (
    <div
      onClick={onClick}
      className={`group relative cursor-pointer select-none transition-all duration-300 ${
        isHighlighted ? "opacity-100" : "opacity-35 grayscale"
      }`}
    >
      {/* 3D Floor Shadow */}
      <div
        className={`absolute -inset-x-2 -bottom-4 h-8 rounded-full blur-md transition-all duration-300 ${
          isSelected
            ? "bg-lime/25 scale-110 translate-y-3"
            : "bg-black/60 scale-95 translate-y-1 group-hover:bg-lime/15 group-hover:translate-y-2 group-hover:scale-105"
        }`}
      />

      {/* Physical 3D Box Block Container */}
      <div
        className={`relative transition-all duration-300 transform ${
          isSelected
            ? "-translate-y-3 scale-[1.02]"
            : "group-hover:-translate-y-2 group-hover:scale-[1.01]"
        }`}
      >
        {/* TOP FACE of the 3D Box */}
        <div
          className={`relative rounded-t-2xl border-t-2 border-x-2 p-5 transition-all duration-300 ${
            isSelected
              ? "border-lime bg-[#1d2117] shadow-[inset_0_1px_1px_rgba(216,255,67,0.4)]"
              : "border-[#383c2e] bg-[#161812] group-hover:border-lime group-hover:bg-[#1b1e16]"
          }`}
        >
          {/* Top Status Bar & Node Icon */}
          <div className="flex items-center justify-between">
            <span
              className={`grid size-10 place-items-center rounded-xl font-bold shadow-md transition ${
                node.badgeBg
              }`}
            >
              <Icon size={20} />
            </span>

            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-lime animate-pulse" />
              <span className="rounded bg-[#11130d] border border-[#2b2e23] px-2 py-0.5 font-mono text-[10px] font-bold text-lime">
                {node.metric}
              </span>
            </div>
          </div>

          {/* Node Identity */}
          <div className="mt-4">
            <h3 className="text-base font-bold text-white tracking-tight leading-snug">
              {node.name}
            </h3>
            <p className="mt-1 text-xs text-[#a0a398] font-medium leading-relaxed">
              {node.sub}
            </p>
          </div>

          {/* Tech Spec Tag */}
          <div className="mt-4 border-t border-[#25281e] pt-2 text-[10px] font-mono text-[#72756a]">
            {node.tech}
          </div>
        </div>

        {/* FRONT EXTRUDED 3D FACE (Box Height & Thickness) */}
        <div
          className={`relative h-6 w-full rounded-b-2xl border-b-4 border-x-2 transition-all duration-300 flex items-center justify-between px-4 font-mono text-[9px] ${
            isSelected
              ? "border-b-lime/60 border-x-lime bg-[#0c0e09] text-lime"
              : "border-b-[#202319] border-x-[#383c2e] bg-[#0c0d08] text-[#55584b] group-hover:border-x-lime group-hover:border-b-lime/40"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-current opacity-70" />
            <span className="font-bold uppercase tracking-wider">CHASSIS 3D</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="size-1 rounded-sm bg-current opacity-40" />
            <span className="size-1 rounded-sm bg-current opacity-60" />
            <span className="size-1 rounded-sm bg-current opacity-90" />
          </div>
        </div>
      </div>
    </div>
  );
}
