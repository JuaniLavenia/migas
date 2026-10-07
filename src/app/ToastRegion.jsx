import { useEffect } from "react";
import { CircleDollarSign } from "lucide-react";
import useToastStore from "../stores/useToastStore";

const TOAST_DURATION_MS = 2500;

// The live region stays mounted (empty between toasts) so screen readers
// announce each message when it is inserted into it.
function ToastRegion() {
  const toast = useToastStore((state) => state.toast);
  const clearToast = useToastStore((state) => state.clearToast);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(clearToast, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  return (
    <div role="status" aria-live="polite" aria-label="Notificaciones">
      {toast && (
        <div className="toast">
          <CircleDollarSign size={17} aria-hidden="true" /> {toast.message}
        </div>
      )}
    </div>
  );
}

export default ToastRegion;
