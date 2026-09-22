import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { OverviewTab } from "./overview_tab";
import { mockPlatformMetrics, mockSystemHealth } from "../lib/mock_data";

const meta: Meta<typeof OverviewTab> = {
  title: "Admin/Tabs/OverviewTab",
  component: OverviewTab,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "System Overview tab displaying top-level KPIs, storage allocation breakdown, ingestion pipelines, and live health status for PostgreSQL, Valkey, RabbitMQ, and Garage S3.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof OverviewTab>;

export const DefaultHealthy: Story = {
  args: {
    metrics: mockPlatformMetrics,
    systemHealth: mockSystemHealth,
  },
};

export const HighStorageWarning: Story = {
  args: {
    metrics: {
      ...mockPlatformMetrics,
      total_storage_bytes: 9.4 * 1024 * 1024 * 1024 * 1024, // 9.4 TB out of 10 TB (94%)
      transcoding_queue_depth: 18,
      blocked_rate_limit_requests: 84,
    },
    systemHealth: mockSystemHealth.map((svc) =>
      svc.name.includes("Garage")
        ? {
            ...svc,
            status: "degraded" as const,
            details: "Storage capacity threshold reached 94%. Node 3 disk high watermark.",
          }
        : svc,
    ),
  },
};
