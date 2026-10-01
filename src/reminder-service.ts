import cron from "node-cron";
import { type Client } from "discord.js";

import {
  findMeetingReminders,
  recordReminderDelivery,
  type MeetingReminder,
  type ReminderTiming,
} from "./database";
import { formatKoreanTime, toKoreaTime } from "./time";

const REMINDER_LEAD_TIME_MS = 10 * 60 * 1000;
const START_TIME_LOOKBACK_MS = 2 * 60 * 1000;

function createReminderMessage(meeting: MeetingReminder, timing: ReminderTiming): string {
  const startAt = toKoreaTime(meeting.startAt);
  const isStartTime = timing === "at-start";

  return [
    isStartTime ? "🔔 **회의 시작 알림**" : "🔔 **회의 시작 10분 전 알림**",
    "",
    `📅 **${meeting.title}**`,
    `📍 ${meeting.location}`,
    `📆 ${startAt.format("YYYY년 M월 D일")}`,
    `🕑 ${formatKoreanTime(startAt)} (${startAt.format("HH:mm")})`,
    "",
    isStartTime ? "회의가 지금 시작됩니다." : "회의가 10분 후 시작됩니다.",
  ].join("\n");
}

async function sendMeetingReminders(client: Client, timing: ReminderTiming, windowStart: Date, windowEnd: Date) {
  const meetings = findMeetingReminders(timing, windowStart.toISOString(), windowEnd.toISOString());

  for (const meeting of meetings) {
    const message = createReminderMessage(meeting, timing);

    for (const attendeeId of meeting.attendeeIds) {
      try {
        const user = await client.users.fetch(attendeeId);
        await user.send(message);
        recordReminderDelivery(timing, meeting.id, attendeeId);
      } catch (error) {
        console.error(`회의 ${meeting.id}의 참석자 ${attendeeId}에게 알림을 보내지 못했습니다.`, error);
      }
    }
  }
}

async function sendUpcomingMeetingReminders(client: Client) {
  const now = new Date();
  const tenMinutesLater = new Date(now.getTime() + REMINDER_LEAD_TIME_MS);
  const startLookback = new Date(now.getTime() - START_TIME_LOOKBACK_MS);

  await sendMeetingReminders(client, "ten-minutes-before", now, tenMinutesLater);
  await sendMeetingReminders(client, "at-start", startLookback, now);
}

export function startReminderScheduler(client: Client) {
  const runReminders = async () => {
    try {
      await sendUpcomingMeetingReminders(client);
    } catch (error) {
      console.error("회의 알림 확인 중 오류가 발생했습니다.", error);
    }
  };

  void runReminders();

  cron.schedule("* * * * *", runReminders, {
    name: "meeting-reminders",
    noOverlap: true,
  });
}
