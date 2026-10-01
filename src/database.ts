import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const databasePath = process.env.MEETING_DATABASE_PATH ?? join(process.cwd(), "data", "meetings.db");

mkdirSync(dirname(databasePath), { recursive: true });

const database = new Database(databasePath);

database.pragma("foreign_keys = ON");
database.pragma("journal_mode = WAL");

database.exec(`
  CREATE TABLE IF NOT EXISTS meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    start_at TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    organizer_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS meeting_attendees (
    meeting_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    reminded_at TEXT,
    start_reminded_at TEXT,
    PRIMARY KEY (meeting_id, user_id),
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS meetings_start_at_idx ON meetings(start_at);
`);

function ensureColumn(table: "meetings" | "meeting_attendees", column: string, definition: string) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];

  if (!columns.some(({ name }) => name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

ensureColumn("meeting_attendees", "reminded_at", "reminded_at TEXT");
ensureColumn("meeting_attendees", "start_reminded_at", "start_reminded_at TEXT");

type NewMeeting = {
  title: string;
  location: string;
  startAt: string;
  channelId: string;
  organizerId: string;
  attendeeIds: string[];
};

const insertMeeting = database.prepare(`
  INSERT INTO meetings (title, location, start_at, channel_id, organizer_id)
  VALUES (@title, @location, @startAt, @channelId, @organizerId)
`);

const insertAttendee = database.prepare(`
  INSERT INTO meeting_attendees (meeting_id, user_id)
  VALUES (?, ?)
`);

const findTenMinuteReminders = database.prepare(`
  SELECT
    meetings.id,
    meetings.title,
    meetings.location,
    meetings.start_at AS startAt,
    meeting_attendees.user_id AS attendeeId
  FROM meetings
  INNER JOIN meeting_attendees ON meeting_attendees.meeting_id = meetings.id
  WHERE meetings.start_at >= ?
    AND meetings.start_at <= ?
    AND meeting_attendees.reminded_at IS NULL
  ORDER BY meetings.start_at, meetings.id
`);

const findStartTimeReminders = database.prepare(`
  SELECT
    meetings.id,
    meetings.title,
    meetings.location,
    meetings.start_at AS startAt,
    meeting_attendees.user_id AS attendeeId
  FROM meetings
  INNER JOIN meeting_attendees ON meeting_attendees.meeting_id = meetings.id
  WHERE meetings.start_at >= ?
    AND meetings.start_at <= ?
    AND meeting_attendees.start_reminded_at IS NULL
  ORDER BY meetings.start_at, meetings.id
`);

const markTenMinuteReminderDelivered = database.prepare(`
  UPDATE meeting_attendees
  SET reminded_at = ?
  WHERE meeting_id = ? AND user_id = ? AND reminded_at IS NULL
`);

const markStartTimeReminderDelivered = database.prepare(`
  UPDATE meeting_attendees
  SET start_reminded_at = ?
  WHERE meeting_id = ? AND user_id = ? AND start_reminded_at IS NULL
`);

export const saveMeeting = database.transaction((meeting: NewMeeting): number => {
  const result = insertMeeting.run(meeting);
  const meetingId = Number(result.lastInsertRowid);

  for (const attendeeId of meeting.attendeeIds) {
    insertAttendee.run(meetingId, attendeeId);
  }

  return meetingId;
});

type ReminderRow = {
  id: number;
  title: string;
  location: string;
  startAt: string;
  attendeeId: string;
};

export type MeetingReminder = {
  id: number;
  title: string;
  location: string;
  startAt: string;
  attendeeIds: string[];
};

export type ReminderTiming = "ten-minutes-before" | "at-start";

export function findMeetingReminders(timing: ReminderTiming, windowStart: string, windowEnd: string): MeetingReminder[] {
  const statement = timing === "ten-minutes-before" ? findTenMinuteReminders : findStartTimeReminders;
  const rows = statement.all(windowStart, windowEnd) as ReminderRow[];
  const reminders = new Map<number, MeetingReminder>();

  for (const row of rows) {
    const reminder = reminders.get(row.id) ?? {
      id: row.id,
      title: row.title,
      location: row.location,
      startAt: row.startAt,
      attendeeIds: [],
    };

    reminder.attendeeIds.push(row.attendeeId);
    reminders.set(row.id, reminder);
  }

  return [...reminders.values()];
}

export function recordReminderDelivery(timing: ReminderTiming, meetingId: number, attendeeId: string) {
  const statement = timing === "ten-minutes-before" ? markTenMinuteReminderDelivered : markStartTimeReminderDelivered;
  statement.run(new Date().toISOString(), meetingId, attendeeId);
}
