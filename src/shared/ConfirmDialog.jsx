import * as AlertDialog from "@radix-ui/react-alert-dialog";

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Eliminar",
  onConfirm,
  onCancel,
}) {
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="modal-backdrop" />
        <AlertDialog.Content className="modal confirm-dialog">
          <AlertDialog.Title asChild>
            <h2>{title}</h2>
          </AlertDialog.Title>
          <AlertDialog.Description asChild>
            <p>{description}</p>
          </AlertDialog.Description>
          <div className="modal-actions">
            <AlertDialog.Cancel asChild>
              <button type="button" className="secondary-button">
                Cancelar
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                className="primary-button danger"
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export default ConfirmDialog;
