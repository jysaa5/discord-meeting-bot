import {
  ActionRowBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from "discord.js";

import { nowInKorea } from "./time";

export function createMeetingDetailsModal() {
  const titleInput = new TextInputBuilder()
    .setCustomId("meeting-title")
    .setLabel("회의 제목")
    .setPlaceholder("예: 프로젝트 개발 회의")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const locationInput = new TextInputBuilder()
    .setCustomId("meeting-location")
    .setLabel("회의 장소")
    .setPlaceholder("예: 3층 회의실 또는 온라인")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  return new ModalBuilder()
    .setCustomId("meeting-title-modal")
    .setTitle("회의 등록")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(locationInput),
    );
}

export function createDateSelectRow() {
  const today = nowInKorea();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  const options = Array.from({ length: 14 }, (_, index) => {
    const date = today.add(index, "day");
    const prefix = index === 0 ? "오늘 · " : index === 1 ? "내일 · " : "";

    return {
      label: `${prefix}${date.format("M월 D일")} (${weekdays[date.day()]})`,
      value: date.format("YYYY-MM-DD"),
    };
  });

  const select = new StringSelectMenuBuilder()
    .setCustomId("meeting-date")
    .setPlaceholder("날짜를 선택해주세요")
    .addOptions(options);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

export function createTimeModal() {
  const timeInput = new TextInputBuilder()
    .setCustomId("meeting-time")
    .setLabel("시간과 분 (24시간제 HH:mm)")
    .setPlaceholder("예: 14:37")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(5)
    .setMaxLength(5);

  return new ModalBuilder()
    .setCustomId("meeting-time-modal")
    .setTitle("회의 시작 시간")
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(timeInput));
}

export function createAttendeeSelectRow() {
  const select = new UserSelectMenuBuilder()
    .setCustomId("meeting-attendees")
    .setPlaceholder("필수 참석자를 선택해주세요")
    .setMinValues(1)
    .setMaxValues(25);

  return new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(select);
}
