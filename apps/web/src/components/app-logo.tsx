"use client";

import * as React from "react";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOGO_IMAGE_URL } from "@/lib/constants";

export function AppLogo({
  className,
  size = 40,
  withFallback = true,
  withRing = true,
}: {
  className?: string;
  size?: number;
  withFallback?: boolean;
  withRing?: boolean;
}) {
  const [errored, setErrored] = React.useState(false);
  const shouldRenderImage = !errored;

  const containerClass = cn(
    "shrink-0 bg-background inline-flex items-center justify-center rounded-xl overflow-hidden",
    withRing ? "ring-1 ring-border bg-primary/10 text-primary" : "bg-transparent",
    className,
  );

  const style = React.useMemo(
    () => ({ width: size, height: size }),
    [size],
  );

  return (
    <div
      className={containerClass}
      style={style}
      aria-label="Criminals System Logo"
      role="img"
    >
      {shouldRenderImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={LOGO_IMAGE_URL}
          alt="Criminals System"
          onError={() => withFallback && setErrored(true)}
          className="h-full w-full object-contain select-none"
          draggable={false}
        />
      ) : (
        <Shield
          className="h-1/2 w-1/2 text-primary"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default AppLogo;
