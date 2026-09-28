"use client";

import { CreditCard, Download, Receipt, ShieldCheck } from "lucide-react";
import React from "react";

import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/ui";

interface InvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationName: string;
  planName: string;
  planPrice: string;
}

export function InvoicesModal({
  isOpen,
  onClose,
  organizationName,
  planName,
  planPrice,
}: InvoicesModalProps) {
  const sampleInvoices = [
    {
      id: "INV-2026-001",
      date: "Sep 27, 2026",
      description: `${planName} (Monthly Subscription)`,
      amount: planPrice,
      status: "Paid",
    },
    {
      id: "INV-2026-000",
      date: "Aug 27, 2026",
      description: `${planName} (Monthly Subscription)`,
      amount: planPrice,
      status: "Paid",
    },
  ];

  const handleDownloadInvoice = (invoiceId: string, amount: string, date: string) => {
    const invoiceContent = `=======================================================
FEED.IO - SUBSCRIPTION INVOICE & RECEIPT
=======================================================
Invoice Number : ${invoiceId}
Invoice Date   : ${date}
Status         : PAID (via Stripe)
Organization   : ${organizationName}
Plan           : ${planName}
Billing Cycle  : Monthly
Amount Paid    : ${amount}
Payment Method : Visa ending in 4242
=======================================================
No per-seat charges applied. Unlimited team members
and reviewer seats are included with your storage room.

Thank you for building on Feedi!
Support: billing@feed.io | https://feed.io
=======================================================`;

    const blob = new Blob([invoiceContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Feedi-${invoiceId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <div className="relative">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogEyebrow>STRIPE BILLING PORTAL</DialogEyebrow>
              <DialogTitle id="invoices-modal-title">
                Invoices &amp; Payment Methods
              </DialogTitle>
            </div>
            <DialogCloseButton onClick={onClose} />
          </div>
          <DialogDescription>
            Official tax invoices, receipts, and payment method details for{" "}
            <strong className="text-ink">{organizationName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {/* Active Card */}
          <div className="rounded-lg border border-line bg-paper p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded bg-surface border border-line text-ink">
                  <CreditCard className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-ink">
                      Visa ending in 4242
                    </span>
                    <Badge variant="lime" size="sm">
                      Default
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted">
                    Expires 12/2028 · Managed via Stripe
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted">
                <ShieldCheck className="h-3.5 w-3.5 text-focus" />
                <span className="hidden sm:inline font-mono text-[10px]">Encrypted</span>
              </div>
            </div>
          </div>

          {/* Invoices List */}
          <div className="space-y-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted">
              Past Invoices &amp; Receipts
            </span>

            <div className="overflow-hidden rounded-lg border border-line bg-surface">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-paper font-mono text-[10px] font-bold uppercase text-muted">
                  <tr>
                    <th className="px-3.5 py-2">Invoice</th>
                    <th className="px-3.5 py-2">Date</th>
                    <th className="px-3.5 py-2">Amount</th>
                    <th className="px-3.5 py-2">Status</th>
                    <th className="px-3.5 py-2 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {sampleInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-paper/40 transition-colors">
                      <td className="px-3.5 py-3 font-mono font-bold text-ink">
                        {inv.id}
                      </td>
                      <td className="px-3.5 py-3 text-muted">{inv.date}</td>
                      <td className="px-3.5 py-3 font-mono font-semibold text-ink">
                        {inv.amount}
                      </td>
                      <td className="px-3.5 py-3">
                        <Badge variant="lime" size="sm">
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDownloadInvoice(inv.id, inv.amount, inv.date)
                          }
                          className="h-7 px-2 text-[11px] gap-1"
                        >
                          <Download className="h-3 w-3" />
                          <span>PDF</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dev / Production Mode Explainer */}
          <div className="rounded-lg border border-line bg-paper p-3 text-xs text-muted space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-ink">
              <Receipt className="h-3.5 w-3.5" />
              <span>Stripe Customer Portal (Development Mock Mode)</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              In production with a live Stripe API key, clicking &ldquo;Manage in Stripe&rdquo; securely redirects customers to Stripe&rsquo;s official hosted billing portal (<code>billing.stripe.com</code>).
            </p>
          </div>
        </DialogBody>

        <DialogFooter className="flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              handleDownloadInvoice(
                sampleInvoices[0].id,
                sampleInvoices[0].amount,
                sampleInvoices[0].date
              );
            }}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Latest Receipt</span>
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
