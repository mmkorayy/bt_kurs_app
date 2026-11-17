import type { Appointment, Client, ReminderMinutes, ReminderNotification, User } from '../domain/types.js';

export interface UserWithSettings extends User {
  reminderMinutesBefore: ReminderMinutes | null;
}

export interface UserRepository {
  findById(id: string): Promise<User | undefined>;
  getReminderSettings(userId: string): Promise<ReminderMinutes | null>;
  updateReminderSettings(userId: string, minutes: ReminderMinutes | null): Promise<ReminderMinutes | null>;
  listUsersWithRemindersEnabled(): Promise<UserWithSettings[]>;
}

export interface ClientRepository {
  create(client: Client): Promise<Client>;
  /** Silinmiş danışanları da döndürür (randevudaki ad için). */
  findById(userId: string, id: string): Promise<Client | undefined>;
  listActive(userId: string): Promise<Client[]>;
  update(client: Client): Promise<Client>;
}

export interface AppointmentRepository {
  findById(userId: string, id: string): Promise<Appointment | undefined>;
  /** İki ucu dahil; tarih, sonra başlangıç saatine göre sıralı. */
  listByDateRange(userId: string, from: string, to: string): Promise<Appointment[]>;
  /** Danışana göre geçmiş ve gelecek randevular; tarih ve başlangıç saatine göre artan sırada. */
  listByClient(userId: string, clientId: string): Promise<Appointment[]>;
  /**
   * Ekler ya da (id'ye göre) günceller. İptal edilmemiş bir randevu, aynı kullanıcının
   * aynı günündeki başka bir aktif randevuyla kesişirse hiçbir şey yazmadan `undefined` döner.
   */
  saveIfNoConflict(appointment: Appointment): Promise<Appointment | undefined>;
  markReminderSent(userId: string, id: string, sentAt: string): Promise<void>;
  delete(userId: string, id: string): Promise<boolean>;
}

export interface ReminderNotificationRepository {
  create(notification: ReminderNotification): Promise<ReminderNotification>;
  listByUser(userId: string, limit?: number): Promise<ReminderNotification[]>;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
}

export interface SessionStore {
  create(userId: string): Promise<Session>;
  find(token: string): Promise<Session | undefined>;
  delete(token: string): Promise<void>;
}
