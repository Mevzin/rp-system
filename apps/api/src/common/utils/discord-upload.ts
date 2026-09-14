import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type UploadToDiscordInput = {
  file:
  | Buffer
  | Uint8Array
  | ArrayBuffer
  | NodeJS.ReadableStream
  | Blob
  | File;
  filename?: string;
  mimeType?: string;
  channelId?: string;
  caption?: string;
  replyToMessageId?: string;
  suppressEmbeds?: boolean;
};

export type UploadToDiscordResult = {
  channelId: string;
  messageId: string;
  attachmentId: string;
  cdnUrl: string;
  filename: string;
  sizeBytes: number;
  contentType: string;
  jumpUrl: string;
};

@Injectable()
export class DiscordUploadService {
  private readonly logger = new Logger(DiscordUploadService.name);
  private readonly maxRetries = 2;

  constructor(private readonly configService: ConfigService) { }

  private readEnvOrThrow(): { token: string; defaultChannelId: string | null; guildId: string | null } {
    const token = this.configService.get<string>("DISCORD_BOT_TOKEN");
    const defaultChannelId =
      this.configService.get<string>("FARM_PROOFS_DISCORD_CHANNEL_ID") ??
      this.configService.get<string>("DISCORD_PROOF_CHANNEL_ID") ??
      null;
    const guildId = this.configService.get<string>("DISCORD_GUILD_ID") ?? null;
    if (!token) {
      throw new BadRequestException(
        "Integração Discord não configurada (DISCORD_BOT_TOKEN ausente). Contate um administrador.",
      );
    }
    return { token, defaultChannelId, guildId };
  }

  private static sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  getDefaultProofsChannelId(): string | null {
    return this.readEnvOrThrow().defaultChannelId;
  }

  async deleteMessage(
    channelId: string,
    messageId: string,
  ): Promise<boolean> {
    if (!channelId || !messageId) return false;
    const { token } = this.readEnvOrThrow();
    try {
      const res = await fetch(
        `https://discord.com/api/v10/channels/${encodeURIComponent(
          channelId,
        )}/messages/${encodeURIComponent(messageId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bot ${token}`,
          },
        },
      );
      if (res.status === 204 || res.status === 404) return true;
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("Retry-After") ?? 2);
        await DiscordUploadService.sleep(retryAfter * 1000 + 200);
        return this.deleteMessage(channelId, messageId);
      }
      const body = await res.json().catch(() => null as any);
      this.logger.warn(
        `deleteMessage failed ${res.status}: ${JSON.stringify(body ?? {})}`,
      );
      return false;
    } catch (err: any) {
      this.logger.warn(`deleteMessage error: ${err?.message ?? err}`);
      return false;
    }
  }

  async uploadFileToChannel(
    input: UploadToDiscordInput,
  ): Promise<UploadToDiscordResult> {
    const { token, defaultChannelId, guildId } = this.readEnvOrThrow();
    const resolvedChannelId =
      input.channelId?.trim() || defaultChannelId?.trim();
    if (!resolvedChannelId) {
      throw new BadRequestException(
        "Nenhum canal do Discord configurado para enviar comprovantes. Contate um administrador (env FARM_PROOFS_DISCORD_CHANNEL_ID).",
      );
    }

    const filename =
      input.filename?.trim() ||
      (typeof (input.file as any)?.name === "string"
        ? (input.file as File).name
        : null) ||
      `farm-proof-${Date.now()}.bin`;

    const mimeType =
      input.mimeType?.trim() ||
      (typeof (input.file as any)?.type === "string"
        ? (input.file as File).type
        : "") ||
      "application/octet-stream";

    let blob: Blob;
    const fileAsAny = input.file as any;

    const blobParts = (parts: unknown[]): BlobPart[] => parts as BlobPart[];

    if (input.file instanceof Blob || typeof (input.file as any)?.stream === "function") {
      blob = input.file as Blob;
    } else if (Buffer.isBuffer(input.file)) {
      const view = new Uint8Array(
        input.file.buffer,
        input.file.byteOffset,
        input.file.byteLength,
      );
      blob = new Blob(blobParts([view]), { type: mimeType });
    } else if (input.file instanceof Uint8Array) {
      const view = new Uint8Array(
        input.file.buffer,
        input.file.byteOffset,
        input.file.byteLength,
      );
      blob = new Blob(blobParts([view]), { type: mimeType });
    } else if (input.file instanceof ArrayBuffer) {
      blob = new Blob([input.file], { type: mimeType });
    } else if (fileAsAny && typeof fileAsAny.stream === "function") {
      blob = input.file as unknown as Blob;
    } else {
      throw new BadRequestException("Arquivo de anexo inválido.");
    }

    const sizeBytes = blob.size ?? 0;
    const MAX_ALLOWED = 24 * 1024 * 1024;
    if (sizeBytes > MAX_ALLOWED) {
      throw new BadRequestException(
        `Arquivo muito grande (${Math.round(
          sizeBytes / 1024 / 1024,
        )}MB). Tamanho máximo permitido é 24MB (limite do Discord).`,
      );
    }

    const form = new FormData();
    form.append("files[0]", blob, filename);

    const payloadJson: any = {
      attachments: [
        {
          id: "0",
          filename,
          description: input.caption?.slice(0, 1024) || undefined,
        },
      ],
    };
    if (input.suppressEmbeds) payloadJson.flags = 1 << 2;
    if (input.replyToMessageId) {
      payloadJson.message_reference = {
        message_id: input.replyToMessageId,
        channel_id: resolvedChannelId,
        fail_if_not_exists: false,
      };
    }
    if (input.caption) {
      payloadJson.content = input.caption.slice(0, 1990);
    }

    form.append("payload_json", JSON.stringify(payloadJson));

    const endpoint = `https://discord.com/api/v10/channels/${encodeURIComponent(
      resolvedChannelId,
    )}/messages`;

    let lastError: any = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.logger.log(`discord upload retry attempt=${attempt}`);
        }

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bot ${token}`,
          },
          body: form as any,
        });

        if (res.status === 429) {
          const retrySeconds = Number(
            res.headers.get("Retry-After") || String(1 + attempt),
          );
          this.logger.warn(
            `discord rate limit: Retry-After=${retrySeconds}s (attempt ${attempt}/${this.maxRetries})`,
          );
          await DiscordUploadService.sleep(retrySeconds * 1000 + 150);
          continue;
        }

        const rawBody = await res.text();
        let body: any = null;
        try {
          body = rawBody ? JSON.parse(rawBody) : null;
        } catch {
          body = null;
        }

        if (!res.ok) {
          const code = body?.code;
          const msg = body?.message ?? res.statusText;
          if (code === 50013) {
            throw new BadRequestException(
              "O bot não tem permissão para enviar anexos no canal do Discord (verifique permissões 'Enviar mensagens' e 'Anexar arquivos').",
            );
          }
          if (code === 10003) {
            throw new BadRequestException(
              "Canal do Discord informado não existe (FARM_PROOFS_DISCORD_CHANNEL_ID inválido).",
            );
          }
          if (res.status === 400) {
            throw new BadRequestException(
              `Discord rejeitou o upload: ${msg ?? "Arquivo ou formulário inválidos"}`,
            );
          }
          throw new Error(
            `Discord upload failed HTTP ${res.status}: ${msg ?? rawBody?.slice(0, 200) ?? "erro desconhecido"}`,
          );
        }

        if (!body?.attachments || !Array.isArray(body.attachments) || body.attachments.length < 1) {
          throw new Error("Discord não retornou anexos (resposta inesperada).");
        }

        const attachment = body.attachments[0];
        const messageId = body.id as string;
        const attachmentId = attachment.id as string;
        const cdnUrl = (attachment.proxy_url || attachment.url || "") as string;
        if (!cdnUrl || !messageId || !attachmentId) {
          throw new Error("Resposta Discord incompleta (ids faltando).");
        }

        const jumpUrl = body.jump_url
          ? (body.jump_url as string)
          : `https://discord.com/channels/${guildId ?? "@me"}/${resolvedChannelId}/${messageId}`;

        return {
          channelId: resolvedChannelId,
          messageId,
          attachmentId,
          cdnUrl,
          filename: String(attachment.filename ?? filename),
          sizeBytes: Number(attachment.size ?? sizeBytes),
          contentType: String(attachment.content_type ?? mimeType),
          jumpUrl,
        };
      } catch (err: any) {
        lastError = err;
        if (err instanceof BadRequestException) throw err;
        if (attempt >= this.maxRetries) break;
        const wait = 700 * (attempt + 1);
        await DiscordUploadService.sleep(wait);
      }
    }

    const msg = lastError?.message
      ? String(lastError.message)
      : "Erro desconhecido ao enviar arquivo para o Discord.";
    this.logger.error(`uploadFileToChannel failed: ${msg}`);
    throw new BadRequestException(
      `Não foi possível enviar o comprovante para o Discord agora. ${msg}`,
    );
  }
}
