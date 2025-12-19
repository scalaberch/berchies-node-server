import moment from "moment-timezone";
import { serverTimezone } from "../index";

export enum DateTimeFormats {
  standard = "YYYY-MM-DD HH:mm:ss",
  seconds = "X",
  milliseconds = "x",
}

export type DateTimeInput = moment.MomentInput;
export type DateTimeObject = moment.Moment;
export type DurationObject = moment.Duration;

/**
 * create a date/time object from moment
 *
 * @param input
 * @returns
 */
export const DateTime = (input?: moment.MomentInput): DateTimeObject => {
  const tz = getServerTimezone();
  if (typeof input === "number" && !isNaN(input)) {
    return moment.unix(input).tz(tz);
  }
  return moment(input).tz(tz);
};

/**
 * gets the saved server timezone
 *
 * @returns
 */
export const getServerTimezone = () => serverTimezone;

/**
 * gets the date/time now
 *
 * @returns
 */
export const getDateTimeNow = () => DateTime();

/**
 * gets current timestamp
 *
 * @param format
 * @returns
 */
export const getCurrentTimestamp = (format = DateTimeFormats.standard) => {
  return getDateTimeNow().format(format);
};

/**
 * gets server up time
 * @todo: continue implementing this
 *
 * @param humanize
 * @param inSeconds
 * @returns
 */
export const getServerUptime = (humanize = false, inSeconds = true) => {
  const rawUptimeSeconds = process.uptime();
  const duration = moment.duration(rawUptimeSeconds, "seconds");

  // const formattedUptime = duration.format(
  //   "d [days], h [hours], m [minutes], s [seconds]",
  //   {
  //     trim: "all", // Remove leading and trailing units if they are zero
  //     stopTrim: "m", // Stop trimming at minutes (ensures minutes and seconds are always shown, even if 0)
  //   }
  // );

  if (humanize) {
    return duration.humanize();
  }
  if (inSeconds) {
    return duration.asSeconds();
  }

  return duration.humanize();
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

export default {};
