import { useRef, useState } from 'react';
import { ApiError } from '../../../api/client';
import { deleteClient, listClients } from '../../../api/clients';
import type { Client } from '../../../api/types';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { formatShortDate, genderLabel } from '../../../lib/labels';
import { useApi } from '../../../lib/useApi';
import { useDebouncedValue } from '../../../lib/useDebouncedValue';
import { useDocumentTitle } from '../../../lib/useDocumentTitle';
import { ClientForm } from './ClientForm';
import './ClientsPage.css';

const SEARCH_DELAY_MS = 300;

function fullName(client: Client): string {
  return `${client.firstName} ${client.lastName}`;
}

export function ClientsPage() {
  useDocumentTitle('Danışanlar');
  const [search, setSearch] = useState('');
  const searchText = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);
  const { data: clients, loading, error, reload } = useApi(() => listClients(searchText || undefined), [searchText]);

  const [editing, setEditing] = useState<Client | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deletingBusy, setDeletingBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteError('');
    setDeletingBusy(true);
    try {
      await deleteClient(deleting.id);
      setDeleting(null);
      reload();
      // Sil düğmesi satırla birlikte kaybolacağı için odak sayfa başlığına taşınır.
      headingRef.current?.focus();
    } catch (failure) {
      setDeleteError(failure instanceof ApiError ? failure.message : 'Bir şeyler ters gitti.');
    } finally {
      setDeletingBusy(false);
    }
  }

  function renderList() {
    if (error) {
      return (
        <div className="clients-state">
          <p>{error.message}</p>
          <button className="clients-retry" type="button" onClick={reload}>
            Yeniden dene
          </button>
        </div>
      );
    }
    if (!clients && loading) return <p className="clients-state">Danışanlar yükleniyor…</p>;
    if (!clients || clients.length === 0) {
      return (
        <p className="clients-state">{searchText ? 'Aramaya uygun danışan bulunamadı.' : 'Henüz danışan yok'}</p>
      );
    }
    return (
      <ul className="clients-list">
        {clients.map((client) => (
          <li className="clients-row" key={client.id}>
            <div className="clients-info">
              <strong>{fullName(client)}</strong>
              <span>{formatShortDate(client.birthDate)}</span>
              <span>{genderLabel(client.gender)}</span>
            </div>
            <div className="clients-actions">
              <button type="button" aria-label={`Düzenle: ${fullName(client)}`} onClick={() => setEditing(client)}>
                Düzenle
              </button>
              <button type="button" aria-label={`Sil: ${fullName(client)}`} onClick={() => setDeleting(client)}>
                Sil
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="clients">
      <div className="clients-head">
        <h1 ref={headingRef} tabIndex={-1}>
          Danışanlar
        </h1>
        <button className="clients-add" type="button" onClick={() => setEditing('new')}>
          Danışan ekle
        </button>
      </div>
      <div className="clients-search">
        <label htmlFor="clients-search-input">Danışan ara</label>
        <input
          id="clients-search-input"
          type="search"
          autoComplete="off"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {renderList()}

      {editing && (
        <ClientForm
          client={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Danışanı sil"
          message={`${fullName(deleting)} silinsin mi? Eski randevuları görünmeye devam eder.`}
          confirmLabel="Sil"
          error={deleteError}
          busy={deletingBusy}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleting(null);
            setDeleteError('');
          }}
        />
      )}
    </section>
  );
}
