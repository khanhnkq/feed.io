import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { ShareLinkCreateForm } from "./share_link_create_form";

const meta: Meta<typeof ShareLinkCreateForm> = {
  title: "Share/ShareLinkCreateForm",
  component: ShareLinkCreateForm,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="max-w-lg p-6 bg-surface rounded-2xl border border-line shadow-sm">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ShareLinkCreateForm>;

export const Default: Story = {
  args: {
    createdUrl: null,
    onResetCreatedUrl: () => {},
    onViewActiveLinks: () => {},
    expiryDays: 7,
    onExpiryDaysChange: () => {},
    enablePassphrase: false,
    onEnablePassphraseChange: () => {},
    passphrase: "",
    onPassphraseChange: () => {},
    allowComments: true,
    onAllowCommentsChange: () => {},
    allowApproval: true,
    onAllowApprovalChange: () => {},
    allowDownload: false,
    onAllowDownloadChange: () => {},
    isSubmitting: false,
    onSubmit: (e) => e.preventDefault(),
    copiedId: null,
    onCopy: () => {},
  },
};

export const WithPassphrase: Story = {
  args: {
    ...Default.args,
    enablePassphrase: true,
    passphrase: "ClientSecret2026!",
    expiryDays: 30,
    allowDownload: true,
  },
};

export const LinkCreatedSuccess: Story = {
  args: {
    ...Default.args,
    createdUrl: "https://feed.io/share/tok_89f02c9183ba",
    copiedId: null,
  },
};

export const CopiedSuccessState: Story = {
  args: {
    ...Default.args,
    createdUrl: "https://feed.io/share/tok_89f02c9183ba",
    copiedId: "created-link",
  },
};

export const Submitting: Story = {
  args: {
    ...Default.args,
    isSubmitting: true,
  },
};

export const InteractiveForm: Story = {
  render: () => {
    const InteractiveComponent = () => {
      const [createdUrl, setCreatedUrl] = useState<string | null>(null);
      const [expiryDays, setExpiryDays] = useState(7);
      const [enablePassphrase, setEnablePassphrase] = useState(false);
      const [passphrase, setPassphrase] = useState("");
      const [allowComments, setAllowComments] = useState(true);
      const [allowApproval, setAllowApproval] = useState(true);
      const [allowDownload, setAllowDownload] = useState(false);
      const [isSubmitting, setIsSubmitting] = useState(false);
      const [copiedId, setCopiedId] = useState<string | null>(null);

      const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setTimeout(() => {
          setIsSubmitting(false);
          const token = Math.random().toString(36).substring(2, 10);
          setCreatedUrl(`https://feed.io/share/tok_${token}`);
        }, 600);
      };

      const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      };

      return (
        <ShareLinkCreateForm
          createdUrl={createdUrl}
          onResetCreatedUrl={() => setCreatedUrl(null)}
          onViewActiveLinks={() => alert("Viewing active links")}
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
          onSubmit={handleSubmit}
          copiedId={copiedId}
          onCopy={handleCopy}
        />
      );
    };

    return <InteractiveComponent />;
  },
};
