import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";
import { AppModule } from "./app.module";

const mongoBootLogger = new Logger("MongoBoot");

function loadEnvEarly() {
  const candidates = [
    resolve(__dirname, "..", "..", "..", "..", ".env"),
    resolve(__dirname, "..", "..", ".env"),
    resolve(process.cwd(), ".env"),
  ].filter((p) => existsSync(p));
  for (const c of candidates) {
    const r = dotenv.config({ path: c, override: false });
    if (!r.error) {
      mongoBootLogger.debug(`Carregado env: ${c}`);
      return;
    }
  }
  mongoBootLogger.warn(
    "Nenhum arquivo .env encontrado. Usando variáveis do sistema e fallbacks.",
  );
}

function resolveMongoUri(): string {
  return (
    process.env.MONGODB_URI ||
    process.env.MONGODB_URI_LOCAL ||
    "mongodb://127.0.0.1:27017/criminals"
  );
}

async function connectAndWaitMongo(
  timeoutMs = 60000,
  pollIntervalMs = 300,
): Promise<void> {
  const uri = resolveMongoUri();
  const dbName = process.env.MONGODB_DB_NAME || "criminals";
  const timeout = Number(process.env.MONGODB_TIMEOUT_MS || 30000);
  const maskedUri = uri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@");
  mongoBootLogger.log(`Conectando no MongoDB (db=${dbName})...`);
  mongoBootLogger.debug(`URI: ${maskedUri}`);

  mongoose.connection.on("connected", () => {
    mongoBootLogger.log(`✅ Conectado (db=${mongoose.connection.name})`);
  });
  mongoose.connection.on("disconnected", () => {
    mongoBootLogger.warn("⚠️  Desconectado do MongoDB");
  });
  mongoose.connection.on("reconnected", () => {
    mongoBootLogger.log("🔌 Reconectado ao MongoDB");
  });
  mongoose.connection.on("error", (err) => {
    mongoBootLogger.error(`❌ Erro: ${err.message}`);
  });

  try {
    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: timeout,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000,
      maxPoolSize: 50,
      autoCreate: true,
      autoIndex: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    mongoBootLogger.error(
      `Falha ao conectar: ${msg}. Se URI for Atlas, confira Network Access 0.0.0.0/0. Se for local, confira Docker/Mongo rodando (netstat -ano | findstr :27017).`,
    );
    process.exit(1);
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const s = mongoose.connection.readyState;
    if (s === 1) {
      mongoBootLogger.log(
        `✅ MongoDB pronto (db=${mongoose.connection.name}). Iniciando NestJS...`,
      );
      return;
    }
    const label =
      s === 0
        ? "disconnected"
        : s === 2
          ? "connecting"
          : s === 3
            ? "disconnecting"
            : `unknown(${s})`;
    mongoBootLogger.debug(`Aguardando readyState... status=${label}`);
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  mongoBootLogger.error(
    `Timeout de ${timeoutMs}ms aguardando conexão MongoDB (readyState=${mongoose.connection.readyState})`,
  );
  process.exit(1);
}

async function bootstrap() {
  const bootLogger = new Logger("Bootstrap");
  loadEnvEarly();
  await connectAndWaitMongo(60000, 300);

  const app = await NestFactory.create(AppModule);
  const envPort = process.env.PORT || process.env.NEST_PORT;
  const port = Number(envPort || 4000);

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: (origin, callback) => {
      const webUrl = process.env.WEB_URL || "http://localhost:3000";
      const corsOrigins = (process.env.CORS_ORIGIN || "").split(",");
      const allowed = [
        webUrl,
        "http://localhost:3000",
        "http://localhost:4000",
        ...corsOrigins.map((o) => o.trim()).filter(Boolean),
      ];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        mongoBootLogger.warn(`[CORS] Bloqueada origem não permitida: ${origin}`);
        callback(null, true);
      }
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix("api");

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Criminals System API")
    .setDescription("API para gerenciamento de organização de RP")
    .setVersion("1.0")
    .addBearerAuth()
    .addCookieAuth("access_token")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  await app.listen(port);
  bootLogger.log(`🚀 API rodando na porta ${port}`);
  bootLogger.log(`📄 Swagger disponível em http://localhost:${port}/docs`);
  bootLogger.log(`🌐 Health check: http://localhost:${port}/api/health`);
}

process.on("uncaughtException", (err) => {
  new Logger("Process").error(`UncaughtException: ${err.message}`);
  console.error(err);
});
process.on("unhandledRejection", (err) => {
  new Logger("Process").error(`UnhandledRejection: ${String(err)}`);
  console.error(err);
});

bootstrap();
