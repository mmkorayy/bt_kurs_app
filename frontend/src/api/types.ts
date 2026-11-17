// Alan adları api-contract/openapi.yaml ile uyumludur (types.test.ts denetler).

export const GENDERS = ['female', 'male', 'other', 'undisclosed'] as const;
export type Gender = (typeof GENDERS)[number];

export const APPOINTMENT_STATUSES = ['scheduled', 'completed', 'cancelled'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface ClientInput {
  firstName: string;
  lastName: string;
  /** YYYY-MM-DD */
  birthDate: string;
  gender: Gender;
}

export interface Client extends ClientInput {
  id: string;
  userId: string;
  deletedAt: string | null;
}

export interface AppointmentInput {
  clientId: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  startTime: string;
  /** HH:MM */
  endTime: string;
  status?: AppointmentStatus;
  note?: string;
}

/** Randevu yanıtı müşteri adını kendisi taşır (danışan silinmiş olsa bile dolu gelir). */
export interface AppointmentView extends Required<AppointmentInput> {
  id: string;
  userId: string;
  client: { id: string; firstName: string; lastName: string };
}

export const REMINDER_MINUTES = [15, 30, 60] as const;
export type ReminderMinutes = (typeof REMINDER_MINUTES)[number];

/** Yapay zekâ asistanının cümleden çıkardığı taslak; hiçbir şey kaydedilmiş değildir. */
export interface AppointmentDraft {
  /** Danışan kayıtlıysa id'si, değilse null. */
  clientId: string | null;
  /** Danışan kayıtlı değilse cümlede geçen ad ve soyad. */
  suggestedClient: { firstName: string; lastName: string } | null;
  date: string;
  startTime: string;
  endTime: string;
  note: string;
}

export interface ReminderSettings {
  /** null: hatırlatmalar kapalı. */
  reminderMinutesBefore: ReminderMinutes | null;
}

export interface ReminderNotification {
  id: string;
  userId: string;
  appointmentId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  sentAt: string;
}
