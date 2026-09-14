import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuditLogModel, mongoose } from "@criminals/database";
import { AuditAction, ProofType } from "@criminals/shared";
import { uploadProofSchema } from "@criminals/shared";
import type { UploadProofResult, UploadProofInput } from "@criminals/shared";
import { existsSync, mkdirSync, writeFileSync, createReadStream, rmSync } from "fs";
import { join, resolve, basename, extname } from "path";
import { randomUUID } from "crypto";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly uploadDir: string;
  private readonly publicBasePath = "/uploads";

  constructor(private readonly configService: ConfigService) {
    const dir = this.configService.get("UPLOAD_DIR", "./uploads");
    this.uploadDir = resolve(process.cwd(), dir);

    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Pasta de uploads criada em: ${this.uploadDir}`);
    }
  }

  getAbsoluteUploadDir(): string {
    return this.uploadDir;
  }

  private sanitizeFilename(name: string): string {
    const ext = extname(name).toLowerCase();
    const base = basename(name, ext)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 40);
    return `${base || "upload"}${ext}`;
  }

  async uploadProof(
    organizationId: string,
    userId: string,
    fileBuffer: Buffer,
    mimeType: string,
    originalName: string,
    sizeBytes: number,
    query: UploadProofInput,
  ): Promise<UploadProofResult> {
    const validated = uploadProofSchema.safeParse(query);
    if (!validated.success) {
      throw new BadRequestException(validated.error.flatten());
    }

    const { proofType } = validated.data;

    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new BadRequestException(
        `Tipo MIME inválido. Permitidos: ${ALLOWED_MIME_TYPES.join(", ")}`,
      );
    }

    if (sizeBytes > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Arquivo muito grande. Tamanho máximo permitido: ${MAX_FILE_SIZE / 1024 / 1024} MB`,
      );
    }

    const ext = extname(originalName).toLowerCase();
    if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `Extensão inválida. Permitidas: ${ALLOWED_EXTENSIONS.join(", ")}`,
      );
    }

    const orgDir = join(this.uploadDir, organizationId);
    if (!existsSync(orgDir)) mkdirSync(orgDir, { recursive: true });

    const typeDir = join(orgDir, proofType.toLowerCase());
    if (!existsSync(typeDir)) mkdirSync(typeDir, { recursive: true });

    const safeName = this.sanitizeFilename(originalName);
    const finalName = `${Date.now()}-${randomUUID()}${ext || ".jpg"}`;
    const absPath = join(typeDir, finalName);
    const relPath = join(organizationId, proofType.toLowerCase(), finalName).replace(/\\/g, "/");

    try {
      writeFileSync(absPath, fileBuffer);
    } catch (error) {
      this.logger.error(`Falha ao gravar arquivo em disco: ${error}`);
      throw new BadRequestException("Falha ao salvar arquivo no servidor.");
    }

    const storageKey = `local:${relPath}`;
    const url = `${this.publicBasePath}/${relPath}`;

    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    await AuditLogModel.create({
      organizationId: orgObjectId,
      userId: userObjectId,
      action: AuditAction.UPLOAD_CREATED,
      entity: "Upload",
      metadata: {
        storageKey,
        proofType,
        mimeType,
        sizeBytes,
        provider: "local",
        absolutePath: absPath,
        relativePath: relPath,
      },
    });

    return {
      storageKey,
      url,
      metadata: {
        mimeType,
        sizeBytes,
      },
    };
  }

  async uploadGeneric(
    organizationId: string,
    userId: string,
    fileBuffer: Buffer,
    mimeType: string,
    originalName: string,
    sizeBytes: number,
  ): Promise<UploadProofResult> {
    if (sizeBytes > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Arquivo muito grande. Tamanho máximo permitido: ${MAX_FILE_SIZE / 1024 / 1024} MB`,
      );
    }

    const ext = extname(originalName).toLowerCase();

    const orgDir = join(this.uploadDir, organizationId);
    if (!existsSync(orgDir)) mkdirSync(orgDir, { recursive: true });

    const typeDir = join(orgDir, "generic");
    if (!existsSync(typeDir)) mkdirSync(typeDir, { recursive: true });

    const safeName = this.sanitizeFilename(originalName);
    const finalName = `${Date.now()}-${randomUUID()}${ext || ".bin"}`;
    const absPath = join(typeDir, finalName);
    const relPath = join(organizationId, "generic", finalName).replace(/\\/g, "/");

    try {
      writeFileSync(absPath, fileBuffer);
    } catch (error) {
      this.logger.error(`Falha ao gravar arquivo em disco: ${error}`);
      throw new BadRequestException("Falha ao salvar arquivo no servidor.");
    }

    const storageKey = `local:${relPath}`;
    const url = `${this.publicBasePath}/${relPath}`;

    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    await AuditLogModel.create({
      organizationId: orgObjectId,
      userId: userObjectId,
      action: AuditAction.UPLOAD_CREATED,
      entity: "Upload",
      metadata: {
        storageKey,
        mimeType,
        sizeBytes,
        provider: "local",
        absolutePath: absPath,
        relativePath: relPath,
      },
    });

    return {
      storageKey,
      url,
      metadata: {
        mimeType,
        sizeBytes,
      },
    };
  }

  async getFileUrl(storageKey: string): Promise<string> {
    if (storageKey.startsWith("local:")) {
      return `${this.publicBasePath}/${storageKey.slice(6)}`;
    }
    throw new BadRequestException("Chave de storage desconhecida.");
  }

  createReadStreamForStorageKey(storageKey: string) {
    if (!storageKey.startsWith("local:")) {
      throw new BadRequestException("Chave de storage desconhecida.");
    }
    const relPath = storageKey.slice(6);
    const absPath = join(this.uploadDir, relPath);
    if (!existsSync(absPath)) {
      throw new BadRequestException("Arquivo não encontrado.");
    }
    return createReadStream(absPath);
  }

  deleteFileByStorageKey(storageKey: string): boolean {
    try {
      if (!storageKey.startsWith("local:")) return false;
      const relPath = storageKey.slice(6);
      const absPath = join(this.uploadDir, relPath);
      if (existsSync(absPath)) {
        rmSync(absPath, { force: true });
        return true;
      }
    } catch (e) {
      this.logger.warn(`Não foi possível apagar arquivo ${storageKey}: ${e}`);
    }
    return false;
  }
}
