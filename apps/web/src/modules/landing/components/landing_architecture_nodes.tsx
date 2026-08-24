"use client";

import { useState, useRef } from "react";
import {
  Activity,
  Boxes,
  Lock,
  Play,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { gsap, useGSAP } from "../lib/gsap_init";
import { SYSTEM_NODES, LOG_MESSAGES } from "../lib/architecture_data";
import { ArchitectureCircuitSvg } from "./architecture_circuit_svg";
import { IsometricBoxNode } from "./isometric_box_node";
import type { FlowMode } from "../types/architecture";

export function LandingArchitectureNodes() {
  const containerRef = useRef<HTMLElement>(null);
  const [activeMode, setActiveMode] = useState<FlowMode>("all");
  const [activeNode, setActiveNode] = useState<string>("client");
  const [is3DMode, setIs3DMode] = useState<boolean>(true);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".arch-header",
          { y: 25, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.6,
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 90%",
              once: true,
            },
          }
        );

        gsap.fromTo(
          ".iso-canvas-wrapper",
          { y: 35, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 85%",
              once: true,
            },
          }
        );
      });
    },
    { scope: containerRef }
  );

  const selectedNode = SYSTEM_NODES[activeNode] || SYSTEM_NODES.client;

  const isNodeActive = (nodeId: string) => {
    const node = SYSTEM_NODES[nodeId];
    return activeMode === "all" || node?.activeInModes.includes(activeMode);
  };

  return (
    <section
      ref={containerRef}
      id="architecture"
      className="border-t border-line bg-[#0d0e0b] py-20 md:py-32 text-white relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(#d8ff43_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-lime/5 blur-[140px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        {/* Header with Title & Flow Controls */}
        <div className="arch-header flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#2e3028] bg-[#171914] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-lime">
              <Boxes size={12} />
              2.5D ISOMETRIC CUBE TOPOLOGY
            </span>
            <h2 className="mt-4 text-[clamp(32px,4vw,52px)] font-black tracking-tight leading-[1.05]">
              Modular 3D box system architecture.
            </h2>
            <p className="mt-3 max-w-2xl text-sm md:text-base text-[#a0a398]">
              Decoupled 3D node chassis streaming video ingest, WebSocket pins, and self-hosted S3 storage.
            </p>
          </div>

          {/* Interactive Flow Mode Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-[#252720] bg-[#141512] p-1 text-xs font-mono">
              {(
                [
                  { key: "all", label: "Full Mesh" },
                  { key: "ingest", label: "4K Ingest Flow" },
                  { key: "review", label: "Live Sync Flow" },
                  { key: "storage", label: "S3 Sovereignty" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveMode(tab.key)}
                  className={`rounded-lg px-3 py-1.5 font-bold transition ${
                    activeMode === tab.key
                      ? "bg-lime text-ink shadow-sm"
                      : "text-[#888b80] hover:text-white hover:bg-[#1f221a]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIs3DMode(!is3DMode)}
              className="flex items-center gap-1.5 rounded-xl border border-[#2e3028] bg-[#171914] px-3 py-2 text-xs font-mono font-bold text-[#b0b3a7] transition hover:border-lime hover:text-lime"
            >
              <RefreshCw size={12} className={is3DMode ? "text-lime" : "text-muted"} />
              <span>{is3DMode ? "2.5D Isometric ON" : "Flat 2D View"}</span>
            </button>
          </div>
        </div>

        {/* 2.5D Interactive Spatial Canvas */}
        <div className="iso-canvas-wrapper mt-12 rounded-3xl border border-[#2a2d23] bg-[#12140e] p-6 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#23261e] pb-4 font-mono text-xs text-[#8e9185]">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-lime animate-ping" />
              <strong className="text-white">Active Pipeline:</strong>
              <span className="text-lime">
                {activeMode === "all" && "All 6 Services Interconnected (Direct S3 / AMQP / WebSocket)"}
                {activeMode === "ingest" && "Direct S3 Multipart ➔ RabbitMQ Fan-out ➔ FFmpeg 4K Proxy Transcode"}
                {activeMode === "review" && "WebSocket Frame Pins ➔ FastAPI Gateway ➔ PostgreSQL 16 ACID"}
                {activeMode === "storage" && "Self-Hosted Garage S3 Cluster ➔ Direct NVMe Edge Delivery"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-lime">
                <Activity size={12} /> Live Network 41.6ms
              </span>
            </div>
          </div>

          {/* 2.5D Isometric Stage */}
          <div className={`iso-canvas py-8 transition-all duration-700 ${is3DMode ? "perspective-[1400px]" : ""}`}>
            <div
              className={`relative mx-auto max-w-5xl transition-all duration-700 ${
                is3DMode ? "iso-plane" : "transform-none"
              }`}
            >
              <ArchitectureCircuitSvg activeMode={activeMode} />

              {/* 3D Isometric 3-Column Box Grid */}
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 py-4">
                {/* Column 1: Client UI & Database */}
                <div className="flex flex-col gap-12">
                  <IsometricBoxNode
                    node={SYSTEM_NODES.client}
                    isHighlighted={isNodeActive("client")}
                    isSelected={activeNode === "client"}
                    onClick={() => setActiveNode("client")}
                  />

                  <IsometricBoxNode
                    node={SYSTEM_NODES.database}
                    isHighlighted={isNodeActive("database")}
                    isSelected={activeNode === "database"}
                    onClick={() => setActiveNode("database")}
                  />
                </div>

                {/* Column 2: FastAPI Gateway & RabbitMQ Broker */}
                <div className="flex flex-col gap-12">
                  <IsometricBoxNode
                    node={SYSTEM_NODES.gateway}
                    isHighlighted={isNodeActive("gateway")}
                    isSelected={activeNode === "gateway"}
                    onClick={() => setActiveNode("gateway")}
                  />

                  <IsometricBoxNode
                    node={SYSTEM_NODES.queue}
                    isHighlighted={isNodeActive("queue")}
                    isSelected={activeNode === "queue"}
                    onClick={() => setActiveNode("queue")}
                  />
                </div>

                {/* Column 3: Storage Cluster & Transcode Worker */}
                <div className="flex flex-col gap-12">
                  <IsometricBoxNode
                    node={SYSTEM_NODES.storage}
                    isHighlighted={isNodeActive("storage")}
                    isSelected={activeNode === "storage"}
                    onClick={() => setActiveNode("storage")}
                  />

                  <IsometricBoxNode
                    node={SYSTEM_NODES.worker}
                    isHighlighted={isNodeActive("worker")}
                    isSelected={activeNode === "worker"}
                    onClick={() => setActiveNode("worker")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Inspection & Real-time Console Log Terminal */}
          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5 rounded-2xl border border-[#2b2e24] bg-[#161812] p-5">
              <div className="flex items-center justify-between border-b border-[#262820] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className={`grid size-7 place-items-center rounded-lg ${selectedNode.badgeBg} font-bold text-xs`}>
                    <selectedNode.icon size={15} />
                  </span>
                  <span className="font-mono text-xs font-bold text-white">
                    INSPECTOR: {selectedNode.name}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-lime">CONNECTED</span>
              </div>

              <div className="mt-4 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-[#888b80]">
                  <span>Subsystem Role:</span>
                  <span className="text-white font-bold">{selectedNode.sub}</span>
                </div>
                <div className="flex justify-between text-[#888b80]">
                  <span>Tech Stack:</span>
                  <span className="text-lime">{selectedNode.tech}</span>
                </div>
                <div className="flex justify-between text-[#888b80]">
                  <span>Performance Metric:</span>
                  <span className="text-white font-bold">{selectedNode.metric}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-2xl border border-[#2b2e24] bg-[#0c0d0a] p-5 font-mono text-xs text-[#a0a398]">
              <div className="flex items-center justify-between border-b border-[#202219] pb-3">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-lime" />
                  <span className="font-bold text-white">LIVE TELEMETRY STREAM</span>
                </div>
                <span className="text-[10px] text-[#6b6e63]">BUFFER: 256 KB/s</span>
              </div>

              <div className="mt-4 space-y-2 text-[11px] leading-relaxed">
                {LOG_MESSAGES[activeMode].map((log, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-lime font-bold">&gt;</span>
                    <span className={index === 0 ? "text-white font-semibold" : "text-[#8e9185]"}>
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Self-Host Command Strip */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-[#262820] bg-[#141512] px-5 py-3.5 text-xs font-mono">
            <div className="flex items-center gap-2 text-[#888b80]">
              <Lock size={14} className="text-lime" />
              <span>Launch complete stack locally:</span>
              <code className="text-lime bg-[#1e2019] px-2 py-0.5 rounded font-bold">
                make infra-up
              </code>
            </div>
            <div className="flex items-center gap-2 text-lime font-bold">
              <Play size={12} />
              <span>Full Data Sovereignty Guaranteed</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
