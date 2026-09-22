"use client";

import React from "react";
import {
  Activity,
  Building2,
  Database,
  HardDrive,
  Layers,
  Server,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import {
  Badge,
  Card,
  CardBadge,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ProgressBar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui";
import { formatBytes, formatNumber } from "../lib/formatters";
import type { PlatformMetrics, SystemServiceHealth } from "../types";

export interface OverviewTabProps {
  metrics: PlatformMetrics;
  systemHealth: SystemServiceHealth[];
}

export function OverviewTab({ metrics, systemHealth }: OverviewTabProps) {
  const storagePercentage = Math.round(
    (metrics.total_storage_bytes / metrics.storage_capacity_bytes) * 100,
  );

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Top Level Metric KPI Cards */}
      <section
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Platform key performance indicators"
      >
        {/* Total Users */}
        <Card className="bg-surface shadow-[0_2px_10px_rgba(20,21,18,0.02)]">
          <CardHeader>
            <div>
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted">
                Platform Users
              </span>
              <CardTitle as="h3" className="mt-1 text-2xl md:text-3xl">
                {formatNumber(metrics.total_users)}
              </CardTitle>
            </div>
            <CardBadge className="bg-lime text-ink">
              <Users size={18} />
            </CardBadge>
          </CardHeader>
          <CardContent className="mt-4">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <span className="inline-block size-2 rounded-full bg-lime" />
              Active across all organizations
            </CardDescription>
          </CardContent>
        </Card>

        {/* Organizations */}
        <Card className="bg-surface shadow-[0_2px_10px_rgba(20,21,18,0.02)]">
          <CardHeader>
            <div>
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted">
                Organizations
              </span>
              <CardTitle as="h3" className="mt-1 text-2xl md:text-3xl">
                {formatNumber(metrics.active_organizations)}
              </CardTitle>
            </div>
            <CardBadge className="bg-[#ecece5] text-ink">
              <Building2 size={18} />
            </CardBadge>
          </CardHeader>
          <CardContent className="mt-4">
            <CardDescription className="text-xs">
              {formatNumber(metrics.total_projects)} active projects & workspaces
            </CardDescription>
          </CardContent>
        </Card>

        {/* S3 Storage Quota */}
        <Card className="bg-surface shadow-[0_2px_10px_rgba(20,21,18,0.02)]">
          <CardHeader>
            <div>
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted">
                Garage S3 Storage
              </span>
              <CardTitle as="h3" className="mt-1 text-2xl md:text-3xl">
                {formatBytes(metrics.total_storage_bytes)}
              </CardTitle>
            </div>
            <CardBadge className="bg-paper text-ink border border-line">
              <HardDrive size={18} />
            </CardBadge>
          </CardHeader>
          <CardContent className="mt-4 space-y-2">
            <ProgressBar
              value={storagePercentage}
              variant={storagePercentage > 85 ? "danger" : "lime"}
              size="sm"
            />
            <div className="flex items-center justify-between text-[11px] font-mono text-muted">
              <span>Used: {storagePercentage}%</span>
              <span>Cap: {formatBytes(metrics.storage_capacity_bytes)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Gateway & Rate Limiting Throughput */}
        <Card className="bg-surface shadow-[0_2px_10px_rgba(20,21,18,0.02)]">
          <CardHeader>
            <div>
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted">
                Edge Throughput
              </span>
              <CardTitle as="h3" className="mt-1 text-2xl md:text-3xl">
                {formatNumber(metrics.requests_per_minute)}
                <span className="text-sm font-normal text-muted ml-1">r/min</span>
              </CardTitle>
            </div>
            <CardBadge className="bg-ink text-white">
              <Activity size={18} />
            </CardBadge>
          </CardHeader>
          <CardContent className="mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Rate limit 429:</span>
              <Badge variant={metrics.blocked_rate_limit_requests > 0 ? "lime" : "surface"} size="sm">
                {metrics.blocked_rate_limit_requests} blocked
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Storage Breakdown & Transcoding Pipeline */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Storage Distribution */}
        <Card className="bg-surface lg:col-span-2">
          <CardHeader>
            <div>
              <h2 className="text-lg font-bold text-ink">Storage Allocation Breakdown</h2>
              <CardDescription className="text-xs">
                Object distribution across raw video footage, HLS streaming proxies, and audio waveform caches.
              </CardDescription>
            </div>
            <Layers className="text-muted size-5" />
          </CardHeader>
          <CardContent className="mt-6 space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-ink mb-1.5">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-lime" />
                  Original Media & Raw Footage
                </span>
                <span className="font-mono text-muted">
                  {formatBytes(metrics.storage_breakdown.raw_uploads_bytes)}
                </span>
              </div>
              <ProgressBar
                value={Math.round(
                  (metrics.storage_breakdown.raw_uploads_bytes / metrics.total_storage_bytes) * 100,
                )}
                variant="lime"
                size="md"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-ink mb-1.5">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-ink" />
                  Transcoded HLS Streaming Proxies (720p / 1080p)
                </span>
                <span className="font-mono text-muted">
                  {formatBytes(metrics.storage_breakdown.proxies_bytes)}
                </span>
              </div>
              <ProgressBar
                value={Math.round(
                  (metrics.storage_breakdown.proxies_bytes / metrics.total_storage_bytes) * 100,
                )}
                variant="ink"
                size="md"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <div className="flex justify-between text-xs font-medium text-ink mb-1.5">
                  <span>Audio Waveforms Cache</span>
                  <span className="font-mono text-muted">
                    {formatBytes(metrics.storage_breakdown.waveforms_bytes)}
                  </span>
                </div>
                <ProgressBar
                  value={Math.round(
                    (metrics.storage_breakdown.waveforms_bytes / metrics.total_storage_bytes) * 100,
                  )}
                  variant="lime"
                  size="sm"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-ink mb-1.5">
                  <span>Valkey Session & Rate Cache</span>
                  <span className="font-mono text-muted">
                    {formatBytes(metrics.storage_breakdown.cache_bytes)}
                  </span>
                </div>
                <ProgressBar
                  value={Math.round(
                    (metrics.storage_breakdown.cache_bytes / metrics.total_storage_bytes) * 100,
                  )}
                  variant="lime"
                  size="sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Realtime Video Ingestion & Workers */}
        <Card className="bg-surface">
          <CardHeader>
            <div>
              <h2 className="text-lg font-bold text-ink">Ingestion Pipeline</h2>
              <CardDescription className="text-xs">
                RabbitMQ async video processing queues & background workers.
              </CardDescription>
            </div>
            <Zap className="text-lime size-5" />
          </CardHeader>
          <CardContent className="mt-6 space-y-5">
            <div className="rounded-lg border border-line bg-paper p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Active Media Items:</span>
                <span className="font-mono text-sm font-bold text-ink">
                  {formatNumber(metrics.total_media_files)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Queue Depth (Pending):</span>
                <Badge
                  variant={metrics.transcoding_queue_depth > 5 ? "danger" : "success"}
                  size="sm"
                >
                  {metrics.transcoding_queue_depth} jobs
                </Badge>
              </div>
            </div>

            <div className="space-y-2 text-xs text-muted">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-lime animate-pulse" />
                <span>FFmpeg transcoding worker nodes: <strong>Online</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-lime" />
                <span>Rate limiting dev multiplier: <strong>1.0x (Normal)</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-lime" />
                <span>Garage S3 Object replication: <strong>Synced</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Infrastructure Health Status Table */}
      <section className="space-y-4" aria-label="System services health status">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <Server size={18} className="text-muted" />
              Core Infrastructure Health
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Live status of data stores, distributed caching, queues, and reverse proxies.
            </p>
          </div>
          <Badge variant="success" size="md" className="gap-1.5">
            <ShieldCheck size={13} />
            All Systems Operational
          </Badge>
        </div>

        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Component</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Operational Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {systemHealth.map((service) => (
                <TableRow key={service.name}>
                  <TableCell className="font-semibold text-ink">
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-7 place-items-center rounded-md border border-line bg-paper text-ink">
                        <Database size={14} />
                      </div>
                      <div>
                        <div className="font-bold">{service.name}</div>
                        <div className="text-[11px] font-normal text-muted">
                          {service.description}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        service.status === "healthy"
                          ? "success"
                          : service.status === "degraded"
                          ? "danger"
                          : "ink"
                      }
                      size="sm"
                    >
                      {service.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-ink">
                    {service.latency_ms} ms
                  </TableCell>
                  <TableCell className="text-xs text-muted font-mono">
                    {service.details}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </section>
    </div>
  );
}
