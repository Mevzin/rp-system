import type {
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  ButtonInteraction,
  AnySelectMenuInteraction,
  PermissionResolvable,
} from "discord.js";
import type { BotClient } from "@/index";

export interface CommandOptions {
  type?: "string" | "integer" | "boolean" | "user" | "channel" | "role";
  name: string;
  description: string;
  required?: boolean;
  choices?: { name: string; value: string | number }[];
}

export interface CommandData {
  name: string;
  description: string;
  options?: CommandOptions[];
  dmPermission?: boolean;
  defaultMemberPermissions?: PermissionResolvable | null;
}

export interface BotCommand {
  data: CommandData;
  execute: (
    client: BotClient,
    interaction: ChatInputCommandInteraction,
  ) => Promise<void>;
}

export interface BotEvent {
  name: string;
  once?: boolean;
  execute: (client: BotClient, ...args: any[]) => Promise<void> | void;
}

export interface ModalHandler {
  customId: string;
  execute: (
    client: BotClient,
    interaction: ModalSubmitInteraction,
  ) => Promise<void>;
}

export interface ButtonHandler {
  customId: string;
  execute: (
    client: BotClient,
    interaction: ButtonInteraction,
  ) => Promise<void>;
}

export interface SelectMenuHandler {
  customId: string;
  execute: (
    client: BotClient,
    interaction: AnySelectMenuInteraction,
  ) => Promise<void>;
}
