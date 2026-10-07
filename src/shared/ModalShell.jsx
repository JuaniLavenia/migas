import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

// Moves the initial focus to the first form field instead of the close button.
function focusFirstField(event) {
  const field = event.currentTarget.querySelector("input, select, textarea");
  if (!field) return;
  event.preventDefault();
  field.focus();
}

// Modal form dialog, mounted only while open: Radix provides the dialog role,
// the title as its accessible name, the focus trap and Escape to close.
// Clicking outside does nothing, as before, so a half-filled form is never
// lost by accident.
function ModalShell({ title, children, onClose }) {
  // Radix only returns focus to a Dialog.Trigger; these modals are opened by
  // plain buttons, so remember whatever had the focus when it mounted.
  const [opener] = useState(() => document.activeElement);
  function restoreFocus(event) {
    event.preventDefault();
    if (opener?.isConnected) opener.focus();
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-backdrop" />
        <Dialog.Content
          className="modal modal-dialog"
          aria-describedby={undefined}
          onOpenAutoFocus={focusFirstField}
          onCloseAutoFocus={restoreFocus}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <div className="modal-heading">
            <Dialog.Title asChild>
              <h2>{title}</h2>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="icon-button" aria-label="Cerrar">
                <X size={19} />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default ModalShell;
