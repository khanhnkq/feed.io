import type { Meta, StoryObj } from "@storybook/react";
import {
  getListUserSessionsQueryKey,
  type PaginatedResponseSessionResponse,
} from "@feedio/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { SecurityTab } from "./security_tab";

const mockSessionsList: PaginatedResponseSessionResponse = {
  items: [
    {
      id: "sess_01",
      user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0",
      ip_address: "118.69.12.34",
      current: true,
    },
    {
      id: "sess_02",
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0 Safari/537.36",
      ip_address: "14.161.20.55",
      current: false,
    },
  ],
  next_cursor: null,
  has_more: false,
};

const meta: Meta<typeof SecurityTab> = {
  title: "Auth/Security/SecurityTab",
  component: SecurityTab,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Complete Security tab view displaying the Password Change card and the Active Sessions manager.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SecurityTab>;

export const Default: Story = {
  render: () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
          staleTime: Infinity,
          gcTime: Infinity,
        },
      },
    });
    client.setQueryData(getListUserSessionsQueryKey(), mockSessionsList);

    return (
      <QueryClientProvider client={client}>
        <div className="p-8 max-w-4xl bg-surface/30 rounded-2xl border border-line/60">
          <SecurityTab />
        </div>
      </QueryClientProvider>
    );
  },
};
