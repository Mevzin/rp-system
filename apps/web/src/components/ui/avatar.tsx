"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type AvatarProps = React.HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
};

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className,
      )}
      {...props}
    />
  ),
);
Avatar.displayName = "Avatar";

type AvatarImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  onLoadingStatusChange?: (status: "idle" | "loading" | "loaded" | "error") => void;
};

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, alt = "", onError, onLoad, onLoadingStatusChange, ...props }, ref) => {
    const [status, setStatus] = React.useState<"idle" | "loading" | "loaded" | "error">(
      props.src ? "loading" : "idle",
    );

    React.useEffect(() => {
      if (!props.src) {
        setStatus("idle");
        onLoadingStatusChange?.("idle");
      } else {
        setStatus("loading");
        onLoadingStatusChange?.("loading");
      }
    }, [props.src, onLoadingStatusChange]);

    if (status === "error" || status === "idle") {
      return null;
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={ref}
        alt={alt}
        className={cn("aspect-square h-full w-full", className)}
        onLoad={(e) => {
          setStatus("loaded");
          onLoadingStatusChange?.("loaded");
          onLoad?.(e);
        }}
        onError={(e) => {
          setStatus("error");
          onLoadingStatusChange?.("error");
          onError?.(e);
        }}
        {...props}
      />
    );
  },
);
AvatarImage.displayName = "AvatarImage";

type AvatarFallbackProps = React.HTMLAttributes<HTMLDivElement> & {
  delayMs?: number;
};

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, delayMs, ...props }, ref) => {
    const [visible, setVisible] = React.useState(delayMs === undefined);

    React.useEffect(() => {
      if (delayMs === undefined) return;
      const t = window.setTimeout(() => setVisible(true), delayMs);
      return () => window.clearTimeout(t);
    }, [delayMs]);

    if (!visible) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground",
          className,
        )}
        {...props}
      />
    );
  },
);
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
