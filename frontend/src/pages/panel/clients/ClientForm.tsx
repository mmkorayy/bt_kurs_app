import { useState, type FormEvent } from 'react';
import { createClient, updateClient } from '../../../api/clients';
import { ApiError } from '../../../api/client';
import { GENDERS, type Client, type Gender } from '../../../api/types';
import { Modal } from '../../../components/Modal';
import { genderLabel } from '../../../lib/labels';
import './ClientForm.css';

interface ClientFormProps {
  /** Verilirse düzenleme, verilmezse yeni danışan. */
  client?: Client;
  onSaved: () => void;
  onClose: () => void;
}

export function ClientForm({ client, onSaved, onClose }: ClientFormProps) {
  const [firstName, setFirstName] = useState(client?.firstName ?? '');
  const [lastName, setLastName] = useState(client?.lastName ?? '');
  const [birthDate, setBirthDate] = useState(client?.birthDate ?? '');
  const [gender, setGender] = useState<Gender | ''>(client?.gender ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    // Sunucu geçersiz cinsiyeti kendi mesajıyla reddeder; boş seçim olduğu gibi gider.
    const values = { firstName: firstName.trim(), lastName: lastName.trim(), birthDate, gender: gender as Gender };
    try {
      if (client) await updateClient(client.id, values);
      else await createClient(values);
      onSaved();
    } catch (failure) {
      // Pencere açık kalır, yazılanlar korunur.
      setError(failure instanceof ApiError ? failure.message : 'Bir şeyler ters gitti.');
      setSaving(false);
    }
  }

  return (
    <Modal title={client ? 'Danışanı düzenle' : 'Danışan ekle'} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="client-form-field">
          <label htmlFor="client-first-name">Ad</label>
          <input
            id="client-first-name"
            type="text"
            autoComplete="off"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </div>
        <div className="client-form-field">
          <label htmlFor="client-last-name">Soyad</label>
          <input
            id="client-last-name"
            type="text"
            autoComplete="off"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </div>
        <div className="client-form-field">
          <label htmlFor="client-birth-date">Doğum tarihi</label>
          <input
            id="client-birth-date"
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />
        </div>
        <div className="client-form-field">
          <label htmlFor="client-gender">Cinsiyet</label>
          <select id="client-gender" value={gender} onChange={(event) => setGender(event.target.value as Gender | '')}>
            <option value="">Seçin</option>
            {GENDERS.map((value) => (
              <option key={value} value={value}>
                {genderLabel(value)}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p className="modal-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button className="modal-secondary" type="button" onClick={onClose}>
            Vazgeç
          </button>
          <button className="modal-primary" type="submit" disabled={saving}>
            Kaydet
          </button>
        </div>
      </form>
    </Modal>
  );
}
