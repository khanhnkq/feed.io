import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { GuestPassphraseGate } from "./guest_passphrase_gate";

const meta: Meta<typeof GuestPassphraseGate> = {
  title: "GuestReview/GuestPassphraseGate",
  component: GuestPassphraseGate,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof GuestPassphraseGate>;

export const Default: Story = {
  args: {
    title: "Client_Commercial_Director_Cut_v04.mov",
    onVerify: async () => {},
    isVerifying: false,
    verifyError: null,
  },
};

export const Verifying: Story = {
  args: {
    title: "Client_Commercial_Director_Cut_v04.mov",
    onVerify: async () => {},
    isVerifying: true,
    verifyError: null,
  },
};

export const WithInvalidPassphraseError: Story = {
  args: {
    title: "Client_Commercial_Director_Cut_v04.mov",
    onVerify: async () => {},
    isVerifying: false,
    verifyError: "Incorrect passphrase. Please check with the project owner and try again.",
  },
};

export const InteractiveGate: Story = {
  render: () => {
    const InteractiveHost = () => {
      const [isVerifying, setIsVerifying] = useState(false);
      const [verifyError, setVerifyError] = useState<string | null>(null);
      const [isUnlocked, setIsUnlocked] = useState(false);

      const handleVerify = async (entered: string) => {
        setIsVerifying(true);
        setVerifyError(null);
        await new Promise((r) => setTimeout(r, 600));
        setIsVerifying(false);

        if (entered.toLowerCase() === "feedio") {
          setIsUnlocked(true);
        } else {
          setVerifyError("Incorrect passphrase. (Hint for demo: enter 'feedio')");
        }
      };

      if (isUnlocked) {
        return (
          <div className="flex min-h-screen items-center justify-center bg-paper p-6 text-ink">
            <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 shadow-[6px_6px_0_#11130f] text-center space-y-4">
              <div className="inline-flex size-12 items-center justify-center rounded-full bg-lime text-ink font-bold text-xl">
                ✓
              </div>
              <h2 className="text-xl font-bold">Access Granted</h2>
              <p className="text-xs text-muted">Passphrase verified successfully!</p>
              <button
                className="text-xs underline text-muted hover:text-ink cursor-pointer"
                onClick={() => setIsUnlocked(false)}
              >
                Reset demo
              </button>
            </div>
          </div>
        );
      }

      return (
        <GuestPassphraseGate
          title="Client_Commercial_Director_Cut_v04.mov"
          onVerify={handleVerify}
          isVerifying={isVerifying}
          verifyError={verifyError}
        />
      );
    };

    return <InteractiveHost />;
  },
};
