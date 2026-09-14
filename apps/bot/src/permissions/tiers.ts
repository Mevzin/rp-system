import { config } from "@/config";

export function isOwner(roleIds: string[]): boolean {
  return config.roles.owner ? roleIds.includes(config.roles.owner) : false;
}

export function isManager(roleIds: string[]): boolean {
  if (isOwner(roleIds)) return true;
  return config.roles.manager ? roleIds.includes(config.roles.manager) : false;
}

export function isSupervisor(roleIds: string[]): boolean {
  if (isManager(roleIds)) return true;
  return config.roles.supervisor
    ? roleIds.includes(config.roles.supervisor)
    : false;
}

export function tierFromRoles(roleIds: string[]): "OWNER" | "MANAGER" | "SUPERVISOR" | "MEMBER" {
  if (isOwner(roleIds)) return "OWNER";
  if (isManager(roleIds)) return "MANAGER";
  if (isSupervisor(roleIds)) return "SUPERVISOR";
  return "MEMBER";
}
