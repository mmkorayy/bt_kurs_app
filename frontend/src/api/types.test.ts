import spec from '../../../api-contract/openapi.yaml?raw';
import {
  APPOINTMENT_STATUSES,
  GENDERS,
  type AppointmentInput,
  type AppointmentView,
  type Client,
  type ClientInput,
  type User,
} from './types';

// Her kayıt anahtarı arayüzün bir alanıdır (yazım hatasını tsc yakalar) ve arayüzün
// bütün alanlarını içerir (eksik alanı tsc yakalar). Aşağıdaki testler adları openapi.yaml ile karşılaştırır.
const userFields: Record<keyof User, true> = { id: true, email: true, displayName: true };
const clientInputFields: Record<keyof ClientInput, true> = {
  firstName: true,
  lastName: true,
  birthDate: true,
  gender: true,
};
const clientFields: Record<keyof Client, true> = {
  ...clientInputFields,
  id: true,
  userId: true,
  deletedAt: true,
};
const appointmentInputFields: Record<keyof AppointmentInput, true> = {
  clientId: true,
  date: true,
  startTime: true,
  endTime: true,
  status: true,
  note: true,
};
const appointmentViewFields: Record<keyof AppointmentView, true> = {
  ...appointmentInputFields,
  id: true,
  userId: true,
  client: true,
};

const lines = spec.split('\n');
const indentOf = (line: string) => line.length - line.trimStart().length;

// "  schemas:" altındaki bir şemanın (girinti 4) bütün `properties:` bloklarındaki alan adları.
function schemaBlock(name: string): string[] {
  const start = lines.findIndex((l) => l === `    ${name}:`);
  if (start < 0) throw new Error(`Şema bulunamadı: ${name}`);
  const block: string[] = [];
  for (let i = start + 1; i < lines.length && (lines[i].trim() === '' || indentOf(lines[i]) > 4); i++) block.push(lines[i]);
  return block;
}

function propertyNames(name: string): string[] {
  const block = schemaBlock(name);
  const names: string[] = [];
  block.forEach((line, i) => {
    if (line.trim() !== 'properties:') return;
    const childIndent = indentOf(line) + 2;
    for (let j = i + 1; j < block.length && (block[j].trim() === '' || indentOf(block[j]) >= childIndent); j++) {
      if (indentOf(block[j]) === childIndent && block[j].trim().endsWith(':')) names.push(block[j].trim().slice(0, -1));
    }
  });
  return names;
}

function enumValues(name: string): string[] {
  const line = schemaBlock(name).find((l) => l.trim().startsWith('enum:'));
  if (!line) throw new Error(`enum yok: ${name}`);
  return line.slice(line.indexOf('[') + 1, line.indexOf(']')).split(',').map((s) => s.trim());
}

function expectFieldsInSchemas(fields: Record<string, true>, schemas: string[]) {
  const known = schemas.flatMap(propertyNames);
  for (const field of Object.keys(fields)) expect(known, `alan: ${field}`).toContain(field);
}

test('User fields exist in the contract', () => expectFieldsInSchemas(userFields, ['User']));
test('ClientInput fields exist in the contract', () => expectFieldsInSchemas(clientInputFields, ['ClientInput']));
test('Client fields exist in the contract', () => expectFieldsInSchemas(clientFields, ['ClientInput', 'Client']));
test('AppointmentInput fields exist in the contract', () =>
  expectFieldsInSchemas(appointmentInputFields, ['AppointmentInput']));
test('AppointmentView fields exist in the contract', () =>
  expectFieldsInSchemas(appointmentViewFields, ['AppointmentInput', 'AppointmentView']));

test('the client name inside an appointment has id, firstName and lastName in the contract', () => {
  const names = propertyNames('AppointmentView');
  for (const field of ['id', 'firstName', 'lastName']) expect(names).toContain(field);
});

test('gender and status values match the contract', () => {
  expect(enumValues('Gender')).toEqual([...GENDERS]);
  expect(enumValues('AppointmentStatus')).toEqual([...APPOINTMENT_STATUSES]);
});
