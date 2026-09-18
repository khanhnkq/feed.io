import type { Meta, StoryObj } from "@storybook/react";
import {
  getListUserSessionsQueryKey,
  type PaginatedResponseSessionResponse,
} from "@feedio/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { SessionsManager } from "./sessions_manager";

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
    {
      id: "sess_03",
      user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Mobile/15E148",
      ip_address: "118.69.12.34",
      current: false,
    },
  ],
  next_cursor: null,
  has_more: false,
};

const mockSingleSession: PaginatedResponseSessionResponse = {
  items: [
    {
      id: "sess_01",
      user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0",
      ip_address: "127.0.0.1",
      current: true,
    },
  ],
  next_cursor: null,
  has_more: false,
};

function createSessionsQueryClient(sessionsData?: PaginatedResponseSessionResponse) {
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

  const queryKey = getListUserSessionsQueryKey();
  if (sessionsData) {
    client.setQueryData(queryKey, sessionsData);
  }

  return client;
}

const meta: Meta<typeof SessionsManager> = {
  title: "Auth/Security/SessionsManager",
  component: SessionsManager,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Lists all active user sessions across browsers and devices, with IP addresses, current device tag, and revocation controls.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SessionsManager>;

export const MultipleActiveSessions: Story = {
  render: () => {
    const client = createSessionsQueryClient(mockSessionsList);
    return (
      <QueryClientProvider client={client}>
        <div className="max-w-2xl p-6 bg-paper rounded-2xl">
          <SessionsManager />
        </div>
      </QueryClientProvider>
    );
  },
};

export const SingleSessionOnly: Story = {
  render: () => {
    const client = createSessionsQueryClient(mockSingleSession);
    return (
      <QueryClientProvider client={client}>
        <div className="max-w-2xl p-6 bg-paper rounded-2xl">
          <SessionsManager />
        </div>
      </QueryClientProvider>
    );
  },
};

export const ErrorLoadingSessions: Story = {
  render: () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    client.setQueryDefaults(getListUserSessionsQueryKey(), {
      queryFn: () => Promise.reject(new Error("Unable to connect to session service")),
    });

    return (
      <QueryClientProvider client={client}>
        <div className="max-w-2xl p-6 bg-paper rounded-2xl">
          <SessionsManager />
        </div>
      </QueryClientProvider>
    );
  },
};
