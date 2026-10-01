import "dotenv/config";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} 환경변수를 확인해주세요.`);
  }

  return value;
}

export const discordConfig = {
  token: getRequiredEnv("DISCORD_TOKEN"),
  clientId: getRequiredEnv("CLIENT_ID"),
  guildId: getRequiredEnv("GUILD_ID"),
};
