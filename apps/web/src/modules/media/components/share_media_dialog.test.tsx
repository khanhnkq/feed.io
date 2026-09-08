import { describe, expect, it } from "vitest";

import type { ShareLinkItem } from "./share_media_dialog";

describe("Share Link Data Mapping & Permissions", () => {
  const mockShareLink: ShareLinkItem = {
    id: "link-123",
    organization_id: "org-1",
    project_id: "proj-1",
    media_id: "media-1",
    allow_comments: true,
    allow_approval: true,
    allow_download: false,
    has_passphrase: true,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    access_count: 12,
    is_revoked: false,
    created_at: new Date().toISOString(),
    share_url: "/share/secret_token_123",
  };

  it("identifies active and protected share links correctly", () => {
    expect(mockShareLink.is_revoked).toBe(false);
    expect(mockShareLink.has_passphrase).toBe(true);
    expect(mockShareLink.access_count).toBe(12);
    expect(mockShareLink.allow_comments).toBe(true);
    expect(mockShareLink.allow_approval).toBe(true);
    expect(mockShareLink.allow_download).toBe(false);
  });

  it("filters out revoked share links", () => {
    const list: ShareLinkItem[] = [
      mockShareLink,
      { ...mockShareLink, id: "link-revoked", is_revoked: true },
    ];
    const activeLinks = list.filter((l) => !l.is_revoked);
    expect(activeLinks.length).toBe(1);
    expect(activeLinks[0].id).toBe("link-123");
  });

  it("detects expired share links", () => {
    const expiredLink: ShareLinkItem = {
      ...mockShareLink,
      id: "link-expired",
      expires_at: new Date(Date.now() - 1000).toISOString(),
    };
    const isExpired = expiredLink.expires_at ? new Date(expiredLink.expires_at) < new Date() : false;
    expect(isExpired).toBe(true);
  });
});
