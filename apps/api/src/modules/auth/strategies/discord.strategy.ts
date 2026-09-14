import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { Profile, Strategy } from "passport-discord";
import { AuthService } from "../auth.service";

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, "discord") {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.getOrThrow("DISCORD_CLIENT_ID"),
      clientSecret: configService.getOrThrow("DISCORD_CLIENT_SECRET"),
      callbackURL: configService.getOrThrow("DISCORD_REDIRECT_URI"),
      scope: ["identify", "guilds", "guilds.members.read"],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ) {
    const guild = profile.guilds?.find(
      (g) => g.id === process.env.DISCORD_GUILD_ID,
    );

    const { user, token } = await this.authService.validateDiscordUser({
      id: profile.id,
      username: profile.username,
      global_name: profile.global_name ?? null,
      avatar: profile.avatar ?? null,
      guild: guild
        ? {
            id: guild.id,
            roles: [],
          }
        : null,
      accessToken,
      refreshToken,
    });

    return { ...user, token };
  }
}
