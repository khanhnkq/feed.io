"use client";

import {
  getListShareLinksQueryKey,
  useCreateShareLink,
  useListShareLinks,
  useRevokeShareLink,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Globe, Link2, Plus, ShieldAlert } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("list");
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

  // TanStack Query: List share links
  const { data: rawLinks = [], isLoading } = useListShareLinks(
    organizationId,
    projectId,
    mediaId,
    {
      query: {
        enabled: Boolean(isOpen && organizationId && projectId && mediaId),
      },
    },
  );

  const links = useMemo(
    () => (rawLinks as ShareLinkItem[]).filter((l) => !l.is_revoked),
    [rawLinks],
  );

  useEffect(() => {
    if (isOpen) {
      setCreatedUrl(null);
      setCopiedId(null);
    }
  }, [isOpen]);

  const createMutation = useCreateShareLink({
    mutation: {
      onSuccess: (res) => {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const fullUrl = `${origin}${res.share_url}`;
        setCreatedUrl(fullUrl);
        setPassphrase("");
        setEnablePassphrase(false);
        queryClient.invalidateQueries({
          queryKey: getListShareLinksQueryKey(organizationId, projectId, mediaId),
        });
      },
      onError: (err: unknown) => {
        const apiErr = err as { message?: string; response?: { data?: { detail?: string } } };
        setErrorMessage(
          apiErr.response?.data?.detail || apiErr.message || "Failed to create share link",
        );
      },
    },
  });

  const revokeMutation = useRevokeShareLink({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListShareLinksQueryKey(organizationId, projectId, mediaId),
        });
      },
      onError: (err: unknown) => {
        const apiErr = err as { message?: string; response?: { data?: { detail?: string } } };
        setErrorMessage(apiErr.response?.data?.detail || apiErr.message || "Failed to revoke link");
      },
    },
  });

  const handleCreateLink = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    createMutation.mutate({
      organizationId,
      projectId,
      mediaId,
      data: {
        passphrase: enablePassphrase && passphrase.trim() ? passphrase.trim() : null,
        expires_in_days: expiryDays,
        allow_comments: allowComments,
        allow_approval: allowApproval,
        allow_download: allowDownload,
      },
    });
  };

  const handleRevokeLink = (linkId: string) => {
    revokeMutation.mutate({
      organizationId,
      projectId,
      mediaId,
      shareLinkId: linkId,
    });
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
            isSubmitting={createMutation.isPending}
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
                    onCopy={copyToClipboard}
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
