"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LOGO_IMAGE_URL } from "@/lib/constants";

function DiscordSpinner({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ds-gradient" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#5865F2" />
          <stop offset="100%" stopColor="#7782F3" />
        </linearGradient>
      </defs>
      <circle
        cx="18"
        cy="18"
        r="15"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3.5"
      />
      <circle
        cx="18"
        cy="18"
        r="15"
        fill="none"
        stroke="url(#ds-gradient)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="35 94"
        style={{ transformOrigin: "50% 50%" }}
        className="animate-[discord-spin_1s_linear_infinite]"
      />
    </svg>
  );
}

export default function LoginPage() {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginClick = () => {
    if (isLoading) return;
    setIsLoading(true);
    window.location.assign(`${apiBase}/auth/discord`);
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex items-center justify-center p-4">
      <style>{`
        @keyframes discord-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.07] bg-slate-950"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-background/60"
        aria-hidden="true"
      />
      <Card className="relative z-10 w-full max-w-lg shadow-2xl border-border/60">
        <CardHeader className="text-center space-y-5 pb-5">
          <div className="mx-auto flex flex-col items-center gap-3">
            <div className="relative rounded-2xl overflow-hidden ring-1 ring-primary/30 shadow-[0_0_80px_-12px_hsl(var(--primary)/0.35)] bg-background p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LOGO_IMAGE_URL}
                alt="Criminals RP"
                className="h-24 w-24 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display =
                    "none";
                  const p = (e.currentTarget as HTMLImageElement).parentElement;
                  if (p && !p.querySelector(".logo-fallback")) {
                    const fb = document.createElement("div");
                    fb.className =
                      "logo-fallback h-24 w-24 rounded-xl bg-primary/15 text-primary flex items-center justify-center";
                    fb.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
                    p.appendChild(fb);
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">
                Criminals System
              </h1>
            </div>
            <Badge
              variant="outline"
              className="gap-1.5 text-[11px] h-[20px] px-2 border-primary/30 bg-primary/5 text-primary-foreground/80"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Serviços Online
            </Badge>
          </div>
          <CardTitle className="text-xl pt-2">Acesse seu perfil</CardTitle>
          <CardDescription>
            Faça login utilizando sua conta Discord para entrar no painel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            size="lg"
            className="w-full relative overflow-hidden transition-all"
            disabled={isLoading}
            onClick={handleLoginClick}
            aria-busy={isLoading}
          >
            <span
              className={`inline-flex items-center transition-opacity duration-200 ${isLoading ? "opacity-0" : "opacity-100"}`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                className="mr-2"
              >
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
              </svg>
              Entrar com Discord
            </span>

            <span
              className={`absolute inset-0 inline-flex items-center justify-center text-white/95 transition-opacity duration-200 ${isLoading ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              aria-live="polite"
            >
              <DiscordSpinner className="w-5 h-5 mr-2.5 text-white/95" />
              Entrando...
            </span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
