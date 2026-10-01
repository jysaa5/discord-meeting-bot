import { REST, Routes, SlashCommandBuilder } from "discord.js";

import { discordConfig } from "./config";

const commands = [
  new SlashCommandBuilder()
    .setName("회의등록")
    .setDescription("새로운 회의를 등록합니다."),
].map((command) => command.toJSON());

export async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(discordConfig.token);

  console.log("Slash Command 등록 중...");

  await rest.put(
    Routes.applicationGuildCommands(discordConfig.clientId, discordConfig.guildId),
    { body: commands },
  );

  console.log("Slash Command 등록 완료!");
}
