import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { UploadsService } from "./uploads.service";
import { readdirSync, statSync, existsSync, rmdirSync } from "fs";
import { join } from "path";

@Injectable()
export class UploadsCleanupService implements OnModuleInit {
  private readonly logger = new Logger(UploadsCleanupService.name);
  private readonly retentionDays: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly uploadsService: UploadsService,
  ) {
    this.retentionDays = Number(this.configService.get("UPLOAD_RETENTION_DAYS", 30)) || 0;
  }

  onModuleInit() {
    if (this.retentionDays <= 0) {
      this.logger.log(
        "Limpeza automática DESATIVADA (UPLOAD_RETENTION_DAYS <= 0). Arquivos nunca serão apagados.",
      );
      return;
    }
    this.logger.log(
      `Limpeza automática ATIVADA. Arquivos com mais de ${this.retentionDays} dias serão apagados às 03:00 diariamente.`,
    );
    this.runCleanup("STARTUP_INIT");
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: "uploads-cleanup-daily",
    timeZone: "America/Sao_Paulo",
  })
  handleDailyCron() {
    this.runCleanup("CRON_DAILY_3AM");
  }

  private runCleanup(reason: string) {
    if (this.retentionDays <= 0) return;

    const rootDir = this.uploadsService.getAbsoluteUploadDir();
    if (!existsSync(rootDir)) {
      this.logger.warn(`Pasta de uploads não existe: ${rootDir}`);
      return;
    }

    const cutoffDate = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;
    let deleted = 0;
    let skipped = 0;
    let dirsCleaned = 0;

    try {
      deleted = this.deleteOldFilesRecursive(rootDir, cutoffDate);
      dirsCleaned = this.cleanupEmptyDirs(rootDir);
    } catch (e) {
      this.logger.error(`Erro na limpeza [${reason}]: ${e}`);
      return;
    }

    this.logger.log(
      `Limpeza [${reason}] concluída. Excluídos ${deleted} arquivos > ${this.retentionDays} dias; ${dirsCleaned} pastas vazias removidas; ${skipped} ignorados.`,
    );
  }

  private deleteOldFilesRecursive(dir: string, cutoffMs: number): number {
    let count = 0;
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        count += this.deleteOldFilesRecursive(fullPath, cutoffMs);
      } else if (entry.isFile()) {
        try {
          const stats = statSync(fullPath);
          const fileMs = stats.mtimeMs;
          if (fileMs < cutoffMs) {
            const fs = require("fs");
            fs.rmSync(fullPath, { force: true });
            count++;
          }
        } catch (err) {
          this.logger.warn(`Não foi possível analisar/apagar ${fullPath}: ${err}`);
        }
      }
    }
    return count;
  }

  private cleanupEmptyDirs(dir: string): number {
    let count = 0;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        count += this.cleanupEmptyDirs(fullPath);
        const filesInside = readdirSync(fullPath);
        if (filesInside.length === 0 && fullPath !== dir) {
          try {
            rmdirSync(fullPath);
            count++;
          } catch (e) {
            this.logger.warn(`Não remover pasta vazia ${fullPath}: ${e}`);
          }
        }
      }
    }
    return count;
  }
}
