import { Modal } from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  error?: string;
  busy?: boolean;
}

/** Tarayıcının confirm kutusu yerine sayfa içi onay penceresi. */
export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, error, busy }: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p>{message}</p>
      {error && (
        <p className="modal-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button className="modal-secondary" type="button" onClick={onCancel}>
          Vazgeç
        </button>
        <button className="modal-primary" type="button" onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
