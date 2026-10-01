import { type Client, type Interaction } from "discord.js";

import {
  createAttendeeSelectRow,
  createDateSelectRow,
  createMeetingDetailsModal,
  createTimeModal,
} from "./meeting-ui";
import { saveMeeting } from "./database";
import { createMeetingDateTime, formatKoreanTime, isValidTime } from "./time";

type MeetingDraft = {
  title: string;
  location: string;
  date?: string;
  time?: string;
};

const meetingDrafts = new Map<string, MeetingDraft>();
const expiredMessage = "회의 등록 정보가 만료되었습니다. 다시 `/회의등록`을 실행해주세요.";

async function handleMeetingInteraction(interaction: Interaction) {
  if (interaction.isChatInputCommand() && interaction.commandName === "회의등록") {
    await interaction.showModal(createMeetingDetailsModal());
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId === "meeting-title-modal") {
    const title = interaction.fields.getTextInputValue("meeting-title");
    const location = interaction.fields.getTextInputValue("meeting-location");

    meetingDrafts.set(interaction.user.id, { title, location });

    await interaction.reply({
      content: [`📅 **${title}**`, `📍 ${location}`, "", "회의 날짜를 선택해주세요."].join("\n"),
      components: [createDateSelectRow()],
      ephemeral: true,
    });
    return;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "meeting-date") {
    const draft = meetingDrafts.get(interaction.user.id);

    if (!draft) {
      await interaction.reply({ content: expiredMessage, ephemeral: true });
      return;
    }

    draft.date = interaction.values[0];
    await interaction.showModal(createTimeModal());
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId === "meeting-time-modal") {
    const draft = meetingDrafts.get(interaction.user.id);

    if (!draft?.date) {
      await interaction.reply({ content: expiredMessage, ephemeral: true });
      return;
    }

    const time = interaction.fields.getTextInputValue("meeting-time").trim();

    if (!isValidTime(time)) {
      await interaction.reply({
        content: "시간을 `HH:mm` 형식으로 입력해주세요. 예: `09:05`, `14:37`",
        ephemeral: true,
      });
      return;
    }

    draft.time = time;
    const meetingDateTime = createMeetingDateTime(draft.date, time);
    const attendeeMessage = {
      content: [
        `📅 **${draft.title}**`,
        `📍 ${draft.location}`,
        `📆 ${draft.date}`,
        `🕑 ${formatKoreanTime(meetingDateTime)}`,
        "",
        "회의에 참석해야 하는 사람들을 선택해주세요.",
      ].join("\n"),
      components: [createAttendeeSelectRow()],
    };

    if (interaction.isFromMessage()) {
      await interaction.update(attendeeMessage);
    } else {
      await interaction.reply({ ...attendeeMessage, ephemeral: true });
    }
    return;
  }

  if (interaction.isUserSelectMenu() && interaction.customId === "meeting-attendees") {
    const draft = meetingDrafts.get(interaction.user.id);

    if (!draft?.date || !draft.time) {
      await interaction.reply({ content: expiredMessage, ephemeral: true });
      return;
    }

    const attendeeIds = interaction.values;
    const meetingDateTime = createMeetingDateTime(draft.date, draft.time);

    saveMeeting({
      title: draft.title,
      location: draft.location,
      startAt: meetingDateTime.toISOString(),
      attendeeIds,
      channelId: interaction.channelId,
      organizerId: interaction.user.id,
    });

    const attendees = attendeeIds.map((id) => `<@${id}>`).join(", ");

    await interaction.update({
      content: [
        "✅ **회의가 등록되었습니다!**",
        "",
        `📅 **${draft.title}**`,
        `📍 ${draft.location}`,
        `📆 ${meetingDateTime.format("YYYY년 M월 D일")}`,
        `🕑 ${formatKoreanTime(meetingDateTime)} (${meetingDateTime.format("HH:mm")})`,
        `👥 필수 참석자: ${attendees}`,
        "",
        "🔔 회의 10분 전에 알려드릴게요.",
      ].join("\n"),
      components: [],
      allowedMentions: { users: [] },
    });

    meetingDrafts.delete(interaction.user.id);
  }
}

export function registerMeetingInteractions(client: Client) {
  client.on("interactionCreate", handleMeetingInteraction);
}
