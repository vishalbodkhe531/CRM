import { z } from "zod";
import { NOTIFICATION_TYPES } from "../constants/notification.constants";

const NotificationTypeEnum = z.enum(NOTIFICATION_TYPES);

export const NotificationFeedSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  /** When true, already-read notifications are included (the full history). */
  includeRead: z.coerce.boolean().default(true),
  type: NotificationTypeEnum.optional(),
  /**
   * Id of the last row the client already holds; the next page starts strictly
   * below it. A keyset, not a page number — rows arrive continuously, and an
   * offset would repeat items that shifted down while the user was reading.
   */
  cursor: z.string().trim().optional(),
});

export type NotificationFeedInput = z.infer<typeof NotificationFeedSchema>;

/**
 * Which jobs to run.
 *
 * Empty means "all". Naming a subset lets the platform scheduler run cheap jobs
 * often and expensive ones rarely without needing a second endpoint.
 */
export const RunJobsSchema = z.object({
  jobs: z.array(z.string().trim().min(1)).optional(),
});

export type RunJobsInput = z.infer<typeof RunJobsSchema>;
