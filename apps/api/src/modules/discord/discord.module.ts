import { Module } from "@nestjs/common";
import { DiscordController } from "./discord.controller";
import { DiscordService } from "./discord.service";
import { DiscordMemberService } from "./discord-member.service";
import { DiscordRoleService } from "./discord-role.service";
import { MemberSyncService } from "./member-sync.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [DiscordController],
  providers: [
    DiscordService,
    DiscordMemberService,
    DiscordRoleService,
    MemberSyncService,
  ],
  exports: [
    DiscordService,
    DiscordMemberService,
    DiscordRoleService,
    MemberSyncService,
  ],
})
export class DiscordModule {}
