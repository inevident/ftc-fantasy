"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type InviteShareButtonProps = {
  inviteCode: string;
  leagueName: string;
};

type ShareStatus = "copied" | "idle" | "shared" | "unsupported";

function getShareLabel(status: ShareStatus) {
  if (status === "shared") {
    return "Shared";
  }

  if (status === "copied") {
    return "Copied";
  }

  if (status === "unsupported") {
    return "Copy failed";
  }

  return "Share league";
}

export function InviteShareButton({ inviteCode, leagueName }: InviteShareButtonProps) {
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [status, setStatus] = useState<ShareStatus>("idle");

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `/leagues/${inviteCode}`;
    }

    return new URL(`/leagues/${inviteCode}`, window.location.origin).toString();
  }, [inviteCode]);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  async function copyInviteLink() {
    if (!navigator.clipboard?.writeText) {
      setStatus("unsupported");
      return;
    }

    await navigator.clipboard.writeText(inviteUrl);
    setStatus("copied");
  }

  async function handleShare() {
    try {
      if (canNativeShare) {
        await navigator.share({
          text: `Join my FTC Fantasy league with invite code ${inviteCode}.`,
          title: `${leagueName} invite`,
          url: inviteUrl,
        });
        setStatus("shared");
        return;
      }

      await copyInviteLink();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      try {
        await copyInviteLink();
      } catch {
        setStatus("unsupported");
      }
    } finally {
      window.setTimeout(() => setStatus("idle"), 2200);
    }
  }

  const Icon = status === "copied" || status === "shared" ? Check : canNativeShare ? Share2 : Copy;

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:scale-[1.01]",
        status === "unsupported"
          ? "border-amber-300/35 bg-amber-300/10 text-amber-100"
          : "border-cyan-300/30 bg-cyan-300/10 text-cyan-50 hover:border-cyan-200/55",
      )}
      onClick={handleShare}
      type="button"
    >
      <Icon aria-hidden className="h-4 w-4" />
      {getShareLabel(status)}
    </button>
  );
}
