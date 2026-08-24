import {
  Cpu,
  Database,
  Globe,
  HardDrive,
  Radio,
  Zap,
} from "lucide-react";
import type { FlowMode, SystemNode } from "../types/architecture";

export const SYSTEM_NODES: Record<string, SystemNode> = {
  client: {
    id: "client",
    name: "Web Studio & Review UI",
    sub: "Frame-Accurate Video Player",
    tech: "Next.js 16 • React 19 • Canvas",
    metric: "24-60 FPS Canvas",
    icon: Globe,
    badgeBg: "bg-lime text-ink",
    activeInModes: ["all", "ingest", "review"],
  },
  gateway: {
    id: "gateway",
    name: "FastAPI Core Gateway",
    sub: "Async ASGI & Stateless Auth",
    tech: "Python 3.12 • Pydantic v2",
    metric: "< 4.2ms Routing",
    icon: Zap,
    badgeBg: "bg-[#81dce2] text-ink",
    activeInModes: ["all", "ingest", "review"],
  },
  queue: {
    id: "queue",
    name: "RabbitMQ & Valkey Broker",
    sub: "Task Fan-out & Fast Cache",
    tech: "AMQP 0-9-1 • In-Memory",
    metric: "0ms Task Drop",
    icon: Radio,
    badgeBg: "bg-[#ff9d62] text-ink",
    activeInModes: ["all", "ingest"],
  },
  worker: {
    id: "worker",
    name: "FFmpeg Transcode Worker",
    sub: "Automated 4K HLS Proxies",
    tech: "FFmpeg • Multi-threading",
    metric: "Hardware Accel",
    icon: Cpu,
    badgeBg: "bg-[#ff9d62] text-ink",
    activeInModes: ["all", "ingest"],
  },
  storage: {
    id: "storage",
    name: "Garage / S3 Object Cluster",
    sub: "Self-Hosted Sovereign Storage",
    tech: "Direct S3 Multipart • NVMe",
    metric: "0$ Cloud Egress",
    icon: HardDrive,
    badgeBg: "bg-lime text-ink",
    activeInModes: ["all", "ingest", "storage"],
  },
  database: {
    id: "database",
    name: "PostgreSQL 16 Enterprise",
    sub: "ACID Frame Annotations",
    tech: "Asyncpg • Row-Level Sec",
    metric: "100% ACID Integrity",
    icon: Database,
    badgeBg: "bg-[#c9c6ff] text-ink",
    activeInModes: ["all", "review", "storage"],
  },
};

export const LOG_MESSAGES: Record<FlowMode, string[]> = {
  all: [
    "[SYSTEM] Full mesh heartbeat normal • 6/6 nodes synchronized",
    "[STORAGE] Garage cluster status: 12 TB NVMe available • Egress: 0.00$",
    "[GATEWAY] FastAPI routing average latency: 3.8ms • Zero packet drop",
    "[WORKER] FFmpeg transcoder idle • Standing by for ProRes 422 ingest",
  ],
  ingest: [
    "[INGEST 01] Client initialized direct S3 multipart presign request",
    "[INGEST 02] 4.2 GB ProRes 422 master streaming directly to Garage S3 Cluster",
    "[INGEST 03] FastAPI published 'video.transcode.v4' event to RabbitMQ broker",
    "[INGEST 04] FFmpeg Worker sliced HLS 1080p proxy • Extracted audio waveform",
  ],
  review: [
    "[REVIEW 01] Guest reviewer opened frame 00:02:14:18 on mobile browser",
    "[REVIEW 02] Canvas annotation vector sent over WebSocket to Gateway",
    "[REVIEW 03] PostgreSQL asyncpg committed note with frame index 3234",
    "[REVIEW 04] Live broadcast event pushed to all 4 connected studio editors",
  ],
  storage: [
    "[SOVEREIGNTY 01] Data resides strictly on client-owned Garage S3 cluster",
    "[SOVEREIGNTY 02] Zero third-party cloud data scanning or AI model harvesting",
    "[SOVEREIGNTY 03] Direct edge NVMe reads delivering 142 MB/s local playback",
    "[SOVEREIGNTY 04] Automated retention & snapshot backup executed successfully",
  ],
};
