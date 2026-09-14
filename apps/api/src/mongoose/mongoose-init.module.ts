import { Module, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { connect, disconnect } from "@criminals/database";

@Module({
  providers: [ConfigService],
  exports: [],
})
export class MongooseInitModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongooseInitModule.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const uri = this.configService.get<string>("MONGODB_URI");
    if (!uri) {
      this.logger.error("MONGODB_URI não definida — MongoDB não conectará.");
      return;
    }
    try {
      await connect(uri);
      this.logger.log("✅ Conectado ao MongoDB Atlas com sucesso.");
    } catch (e) {
      this.logger.error(`❌ Falha ao conectar MongoDB: ${(e as Error).message}`);
      if (process.env.NODE_ENV !== "development") {
        throw e;
      }
    }
  }

  async onModuleDestroy() {
    try {
      await disconnect();
      this.logger.log("Desconectado do MongoDB.");
    } catch {
      // ignore
    }
  }
}
