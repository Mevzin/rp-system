import type { BotClient } from "@/index";
import type { BotEvent } from "@/types";
import { readyEvent } from "./ready";
import { interactionCreateEvent } from "./interactionCreate";
import { handlers } from "@/embeds";

const events: BotEvent[] = [readyEvent, interactionCreateEvent];

export async function loadEvents(client: BotClient): Promise<void> {
  client.modals = handlers.modals;
  client.buttons = handlers.buttons;
  client.selects = handlers.selects;

  for (const event of events) {
    if (event.once) {
      client.once(event.name, async (...args) => {
        try {
          await event.execute(client, ...args);
        } catch (e) {
          console.error(`❌ Erro no evento ${event.name}:`, e);
        }
      });
    } else {
      client.on(event.name, async (...args) => {
        try {
          await event.execute(client, ...args);
        } catch (e) {
          console.error(`❌ Erro no evento ${event.name}:`, e);
        }
      });
    }
  }
}

export { events };
