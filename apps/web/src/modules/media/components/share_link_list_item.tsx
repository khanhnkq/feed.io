"use client";

import { KeyRound, Trash2 } from "lucide-react";
import React from "react";

import { Badge, Button } from "../../ui";

export interface ShareLinkItem {
  id: string;
  organization_id: string;
  project_id: string;
  media_id?: string;
  allow_comments: boolean;
  allow_approval: boolean;
  allow_download: boolean;
  has_passphrase: boolean;
  expires_at: string | null;
  access_count: number;
  is_revoked: boolean;
  created_at: string;
  share_url?: string;
}

interface ShareLinkListItemProps {
  link: ShareLinkItem;
  onRevoke: (linkId: string) => void;
}

export function ShareLinkListItem({ link, onRevoke }: ShareLinkListItemProps) {
  const isExpired = link.expires_at ? new Date(link.expires_at) < new Date() : false;
  const formattedDate = new Date(link.created_at).toLocaleDateString();
  const expiryText = link.expires_at
    ? `Expires ${new Date(link.expires_at).toLocaleDateString()}`
    : "No Expiration";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface/60 p-3 text-xs">
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-ink">Created on {formattedDate}</span>
          {link.has_passphrase && (
            <Badge variant="outline" size="sm" className="gap-1 text-[10px] py-0">
              <KeyRound size={10} className="text-ink" />
              <span>Passphrase</span>
            </Badge>
          )}
          <Badge
            variant={isExpired ? "danger" : "surface"}
            size="sm"
            className="text-[10px] py-0"
          >
            {expiryText}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span>{link.access_count} views</span>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            {link.allow_comments && <span>Comments ✓</span>}
            {link.allow_approval && <span>Approvals ✓</span>}
            {link.allow_download && <span>Download ✓</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="min-h-7 h-7 px-2 text-muted hover:text-ink hover:bg-paper"
          onClick={() => onRevoke(link.id)}
          title="Revoke Share Link"
        >
          <Trash2 size={13} className="text-muted hover:text-ink" />
        </Button>
      </div>
    </div>
  );
}
