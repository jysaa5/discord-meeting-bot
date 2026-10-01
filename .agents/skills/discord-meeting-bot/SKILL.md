---
name: discord-meeting-bot
description: Develop, debug, and extend the discord.js meeting-registration bot in this repository. Use for changes to the /회의등록 interaction flow, meeting fields, Discord components, command registration, reminders, persistence, or related TypeScript errors.
---

# Discord Meeting Bot

Work within the existing TypeScript and discord.js v14 design unless the requested change requires a broader refactor.

## Project conventions

- Treat `src/index.ts` as the current application entry point.
- Load `DISCORD_TOKEN`, `CLIENT_ID`, and `GUILD_ID` from `.env`. Never print or expose their values.
- Keep environment-variable validation typed so downstream Discord APIs receive `string`, not `string | undefined`.
- Use `Asia/Seoul` for meeting dates and times and preserve the existing dayjs timezone setup.
- Keep interaction replies ephemeral while the user is entering meeting details.
- Preserve the meeting draft flow and its custom IDs when adding a step. Drafts are currently stored by user ID in `meetingDrafts`.
- Prevent attendee mentions from sending notifications unless the user explicitly asks to notify them. Use `allowedMentions` when rendering selected users.

## Discord component constraints

- A string-select menu supports at most 25 options. Choose another interaction pattern when the data exceeds that limit.
- A user-select menu can select at most 25 users.
- Put each select menu in its own `ActionRowBuilder`.
- A modal opened from a message component can update that message only after narrowing the submission with `interaction.isFromMessage()`. Provide a reply fallback when needed.
- Validate user-entered time as a real 24-hour `HH:mm` value before constructing the meeting timestamp. Display it with Korean 오전/오후 wording in the result.

## Change workflow

Read the complete interaction flow before editing because each step depends on the draft created by earlier steps. Update all affected places together: the `MeetingDraft` type, input component, state assignment, intermediate summary, completion message, and persistence/log payload.

After changes, run:

```bash
./node_modules/.bin/tsc --noEmit
```

Do not start the bot merely to type-check a change because startup registers guild commands and connects to Discord. For Discord `50001 Missing Access`, verify that the bot is installed in `GUILD_ID`, that `CLIENT_ID` belongs to the token's application, and that the guild installation includes the `bot` and `applications.commands` scopes.
