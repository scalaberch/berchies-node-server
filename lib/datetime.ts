import moment from "moment-timezone";
import { serverTimezone } from "../defines";

export enum DateTimeFormats {
  standard = "YYYY-MM-DD HH:mm:ss",
  seconds = "X",
  milliseconds = "x",
}

export type DateTimeInput = moment.MomentInput;
export type DateTimeObject = moment.Moment;
export type DurationObject = moment.Duration;

/**
 * Creates a Moment.js object, ensuring it is correctly set to the server's timezone.
 *
 * @param input - A Moment-compatible date/time input (string, number, Date, etc.).
 * @returns A Moment.js object configured with the server's timezone.
 */
export const DateTime = (input?: moment.MomentInput): DateTimeObject => {
  const tz = getServerTimezone();
  // If input is a number (likely a Unix timestamp in seconds), treat it as UTC first.
  if (typeof input === "number" && !isNaN(input)) {
    return moment.utc(input * 1000).tz(tz);
  }
  return moment(input).tz(tz);
};

/**
 * Retrieves the configured server timezone from application defines.
 *
 * @returns The server's timezone string (e.g., 'UTC', 'America/New_York').
 */
export const getServerTimezone = () => serverTimezone;

/**
 * Gets a Moment.js object representing the current date and time in the server's timezone.
 *
 * @returns A Moment.js object for the current time.
 */
export const getDateTimeNow = () => DateTime();

/**
 * Gets the current timestamp in a specified format.
 *
 * @param format - The desired output format, defaults to 'YYYY-MM-DD HH:mm:ss'.
 * @returns A formatted string representing the current timestamp.
 */
export const getCurrentTimestamp = (format = DateTimeFormats.standard) => {
  return getDateTimeNow().format(format);
};

/**
 * Gets the server's uptime.
 *
 * @param humanize - If true, returns a human-readable string (e.g., "a few seconds").
 * @param inSeconds - If true and `humanize` is false, returns the uptime in total seconds.
 * @returns The server uptime as a string or number.
 */
export const getServerUptime = (humanize = false, inSeconds = true) => {
  const rawUptimeSeconds = process.uptime();
  const duration = moment.duration(rawUptimeSeconds, "seconds");

  // const formattedUptime = duration.format(
  //   "d [days], h [hours], m [minutes], s [seconds]",
  // );

  if (humanize) {
    return duration.humanize();
  }
  return inSeconds ? duration.asSeconds() : duration.humanize();
};

/**`
 * Checks if the current day (based on server timezone
 * is strictly after the given timestamp.
 *
 * @param timestamp - Input date/time in a Moment-compatible format
 * @param now - Optional DateTimeObject (defaults to current time)
 * @returns true if 'now' is after the calendar day of 'timestamp'
 */
export const isTodayAfter = (timestamp: string, now: DateTimeObject = null) => {
  const ts = DateTime(timestamp);
  const current = now ?? DateTime();

  const today = current.clone().startOf("day");
  const givenDay = ts.clone().startOf("day");

  return today.isAfter(givenDay);
};

/**
 * Checks if today's date (or a provided 'now' date) is exactly one month
 * after the given timestamp, respecting timezone via your DateTime() wrapper.
 *
 * @param timestamp - The original date/time input.
 * @param now - Optional current time as a Moment instance (useful for testing).
 * @returns True if `now` is exactly one month after `timestamp`, else false.
 */
export const isTodayNextMonth = (timestamp: string, now: DateTimeObject = null) => {
  const ts = DateTime(timestamp).startOf("day");
  const current = (now ?? DateTime()).startOf("day");
  const nextMonthDate = ts.clone().add(1, "month");
  return current.isSame(nextMonthDate, "day");
};
