import type { AppointmentDraft, AppointmentStatus, Client } from '../domain/types.js';

export interface AiAssistant {
  parseAppointmentPrompt(input: {
    prompt: string;
    referenceDate: string;
    clients: Pick<Client, 'id' | 'firstName' | 'lastName'>[];
  }): Promise<AppointmentDraft>;

  summarizeClientHistory(input: {
    clientName: string;
    upcomingAppointment: { date: string; startTime: string; note: string };
    pastAppointments: { date: string; status: AppointmentStatus; note: string }[];
  }): Promise<string>;
}
