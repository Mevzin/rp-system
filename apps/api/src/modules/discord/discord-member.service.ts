import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const API_BASE = "https://discord.com/api/v10";

@Injectable()
export class DiscordMemberService {
  private readonly botToken: string;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.botToken = this.configService.getOrThrow("DISCORD_BOT_TOKEN");
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bot ${this.botToken}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new BadRequestException(
        `Discord API ${res.status} ${res.statusText}: ${errBody}`,
      );
    }

    if (res.status === 204) return undefined as unknown as T;
    return res.json() as Promise<T>;
  }

  async updateNickname(
    guildId: string,
    discordId: string,
    newNickname: string | null,
  ): Promise<void> {
    await this.request<void>(
      `/guilds/${guildId}/members/${discordId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ nick: newNickname ?? "" }),
      },
    );
  }

  async addRole(
    guildId: string,
    discordId: string,
    roleId: string,
  ): Promise<void> {
    await this.request<void>(
      `/guilds/${guildId}/members/${discordId}/roles/${roleId}`,
      { method: "PUT" },
    );
  }

  async removeRole(
    guildId: string,
    discordId: string,
    roleId: string,
  ): Promise<void> {
    await this.request<void>(
      `/guilds/${guildId}/members/${discordId}/roles/${roleId}`,
      { method: "DELETE" },
    );
  }
}
