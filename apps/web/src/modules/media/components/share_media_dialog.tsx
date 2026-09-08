"use client";

import { Globe, Link2, Plus, ShieldAlert } from "lucide-react";
import React, { useEffect, useState } from "react";

import {
  Button,
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Tabs,
} from "../../ui";
import { ShareLinkCreateForm } from "./share_link_create_form";
import { ShareLinkItem, ShareLinkListItem } from "./share_link_list_item";

export type { ShareLinkItem };

interface ShareMediaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  projectId: string;
  mediaId: string;
  mediaTitle: string;
}

export function ShareMediaDialog({
  isOpen,
  onClose,
  organizationId,
  projectId,
  mediaId,
  mediaTitle,
}: ShareMediaDialogProps) {
  const [activeTab, setActiveTab] = useState<string>("list");
  const [links, setLinks] = useState<ShareLinkItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [enablePassphrase, setEnablePassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [allowComments, setAllowComments] = useState(true);
  const [allowApproval, setAllowApproval] = useState(true);
  const [allowDownload, setAllowDownload] = useState(false);

  // Newly created share link
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLinks = async () => {
    if (!organizationId || !projectId || !mediaId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        `/api/v1/organizations/${organizationId}/projects/${projectId}/media/${mediaId}/share-links`,
      );
      if (!res.ok) {
        throw new Error("Failed to load share links");
      }
      const data: ShareLinkItem[] = await res.json();
      const active = data.filter((l) => !l.is_revoked);
      setLinks(active);
      if (active.length === 0) {
        setActiveTab("create");
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error fetching links",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCreatedUrl(null);
      setCopiedId(null);
      fetchLinks();
    }
  }, [isOpen, organizationId, projectId, mediaId]);

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        passphrase:
          enablePassphrase && passphrase.trim() ? passphrase.trim() : null,
        expires_in_days: expiryDays,
        allow_comments: allowComments,
        allow_approval: allowApproval,
        allow_download: allowDownload,
      };

      const res = await fetch(
        `/api/v1/organizations/${organizationId}/projects/${projectId}/media/${mediaId}/share-links`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create share link");
      }

      const result = await res.json();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const fullUrl = `${origin}${result.share_url}`;
      setCreatedUrl(fullUrl);

      // Reset form
      setPassphrase("");
      setEnablePassphrase(false);
      await fetchLinks();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to create share link",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    try {
      const res = await fetch(
        `/api/v1/organizations/${organizationId}/projects/${projectId}/media/${mediaId}/share-links/${linkId}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        throw new Error("Failed to revoke share link");
      }
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to revoke link",
      );
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const tabItems = [
    {
      id: "list",
      label: `Active Links`,
      count: links.length,
      icon: <Link2 size={14} className="text-ink" />,
    },
    {
      id: "create",
      label: "Create New Link",
      icon: <Plus size={14} className="text-ink" />,
    },
  ];

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <DialogHeader>
        <DialogCloseButton onClick={onClose} />
        <DialogEyebrow>External Review</DialogEyebrow>
        <DialogTitle className="text-xl flex items-center gap-2">
          <span>Guest Share Links</span>
        </DialogTitle>
        <DialogDescription>
          Generate secure, standalone links for external clients and
          stakeholders to review{" "}
          <span className="font-semibold text-ink">{mediaTitle}</span> without
          creating an account.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-5">
        <Tabs
          items={tabItems}
          activeId={activeTab}
          onChange={(id) => {
            setActiveTab(id);
            if (id === "create") setCreatedUrl(null);
          }}
          variant="pills"
          size="sm"
          className="border-b border-line pb-2 w-full"
        />

        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600">
            <ShieldAlert size={16} className="shrink-0 mt-0.5 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab: Create Form */}
        {activeTab === "create" && (
          <ShareLinkCreateForm
            createdUrl={createdUrl}
            onResetCreatedUrl={() => setCreatedUrl(null)}
            onViewActiveLinks={() => {
              setActiveTab("list");
              setCreatedUrl(null);
            }}
            expiryDays={expiryDays}
            onExpiryDaysChange={setExpiryDays}
            enablePassphrase={enablePassphrase}
            onEnablePassphraseChange={setEnablePassphrase}
            passphrase={passphrase}
            onPassphraseChange={setPassphrase}
            allowComments={allowComments}
            onAllowCommentsChange={setAllowComments}
            allowApproval={allowApproval}
            onAllowApprovalChange={setAllowApproval}
            allowDownload={allowDownload}
            onAllowDownloadChange={setAllowDownload}
            isSubmitting={isSubmitting}
            onSubmit={handleCreateLink}
            copiedId={copiedId}
            onCopy={copyToClipboard}
          />
        )}

        {/* Tab: Active Links List */}
        {activeTab === "list" && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-xs text-muted">
                Loading share links...
              </div>
            ) : links.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line p-8 text-center space-y-3">
                <Globe className="mx-auto text-muted" size={28} />
                <div className="text-xs font-medium text-ink">
                  No Active Share Links
                </div>
                <p className="text-[11px] text-muted max-w-xs mx-auto">
                  Create a share link to invite external clients, stakeholders,
                  or reviewers to inspect this media asset.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveTab("create")}
                >
                  <Plus size={14} className="text-white" />
                  <span>Create First Link</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {links.map((link) => (
                  <ShareLinkListItem
                    key={link.id}
                    link={link}
                    onRevoke={handleRevokeLink}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </DialogBody>

      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
