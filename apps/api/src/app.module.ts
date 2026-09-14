import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from "@nestjs/serve-static";
import { resolve } from "path";
import { existsSync, mkdirSync } from "fs";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { FarmModule } from "./modules/farm/farm.module";
import { ProofsModule } from "./modules/proofs/proofs.module";
import { GoalsModule } from "./modules/goals/goals.module";
import { RankingsModule } from "./modules/rankings/rankings.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AuditModule } from "./modules/audit/audit.module";
import { DiscordModule } from "./modules/discord/discord.module";
import { StatisticsModule } from "./modules/statistics/statistics.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { VehiclesModule } from "./modules/vehicles/vehicles.module";
import { MembersModule } from "./modules/members/members.module";
import { ProfileModule } from "./modules/profile/profile.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [
        resolve(__dirname, "..", "..", "..", ".env.local"),
        resolve(__dirname, "..", "..", "..", ".env"),
        resolve(__dirname, "..", "..", ".env.local"),
        resolve(__dirname, "..", "..", ".env"),
        ".env.local",
        ".env",
      ].filter((p) => existsSync(p)),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 150,
      },
    ]),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dir = configService.get("UPLOAD_DIR", "./uploads");
        const uploadDir = resolve(process.cwd(), dir);
        if (!existsSync(uploadDir)) {
          mkdirSync(uploadDir, { recursive: true });
        }
        return [
          {
            rootPath: uploadDir,
            serveRoot: "/uploads",
            serveStaticOptions: {
              extensions: ["jpg", "jpeg", "png", "webp", "gif"],
              index: false,
            },
          },
        ];
      },
    }),
    AuthModule,
    UsersModule,
    OrganizationsModule,
    FarmModule,
    ProofsModule,
    GoalsModule,
    RankingsModule,
    InventoryModule,
    NotificationsModule,
    AuditModule,
    DiscordModule,
    StatisticsModule,
    UploadsModule,
    VehiclesModule,
    MembersModule,
    ProfileModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
