import { Client, GatewayIntentBits } from "discord.js";

import { registerCommands } from "./commands";
import { discordConfig } from "./config";
import { registerMeetingInteractions } from "./meeting-flow";
import { startReminderScheduler } from "./reminder-service";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("clientReady", (readyClient) => {
  console.log(`봇 로그인 완료: ${readyClient.user.tag}`);
  startReminderScheduler(readyClient);
});

registerMeetingInteractions(client);

async function start() {
  await registerCommands();
  await client.login(discordConfig.token);
}

start().catch(console.error);
