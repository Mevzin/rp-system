"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import type { UserData } from "@criminals/shared";
import {
  getDisplayName,
  getTierLabel,
  getTierColorClass,
  getUserAvatarUrl,
  getUserInitials,
} from "@/lib/session";

export interface AuthUserProfile {
  id: string;
  discordId: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  tier: UserData["tier"];
  roles: string[];
  permissions: UserData["permissions"];
  organizationId: string;
  displayName: string;
  avatarUrl: string;
  initials: string;
  tierLabel: string;
  tierColorClass: string;
  profileCompleted: boolean;
}

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const query = useQuery<UserData | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        const res = await api.get<UserData>("/auth/me");
        return res ?? null;
      } catch (err: any) {
        if (err?.status === 401 || err?.message?.includes("401")) {
          return null;
        }
        throw err;
      }
    },
    staleTime: 120_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, err) => {
      if (failureCount > 2) return false;
      if (err && typeof err === "object" && "message" in err && String((err as any).message).includes("401")) return false;
      return true;
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        return await api.post<any>("/auth/logout");
      } catch {
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    },
  });

  const profile = useMemo<AuthUserProfile | null>(() => {
    const u = query.data;
    if (!u) return null;
    return {
      id: u.id,
      discordId: u.discordId,
      username: u.username,
      globalName: u.globalName,
      avatar: u.avatar,
      tier: u.tier,
      roles: u.roles ?? [],
      permissions: u.permissions ?? [],
      organizationId: u.organizationId,
      displayName: getDisplayName(u),
      avatarUrl: getUserAvatarUrl(u, 128),
      initials: getUserInitials(u),
      tierLabel: getTierLabel(u.tier),
      tierColorClass: getTierColorClass(u.tier),
      profileCompleted: !!u.profileCompleted,
    };
  }, [query.data]);

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  return {
    user: query.data,
    profile,
    isLoading: query.isPending || query.isFetching,
    isAuthenticated: !!query.data,
    error: query.error,
    logout,
    isLoggingOut: logoutMutation.isPending,
    refetch: query.refetch,
  };
}
