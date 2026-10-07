import { useEffect } from "react";
import { CircleDollarSign } from "lucide-react";
import useToastStore from "../stores/useToastStore";

const TOAST_DURATION_MS = 2500;

function ToastRegion() {
  const toast = useToastStore((state) => state.toast);
  const clearToast = useToastStore((state) => state.clearToast);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(clearToast, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;
  return (
    <div className="toast" role="status">
      <CircleDollarSign size={17} /> {toast.message}
    </div>
  );
}

export default ToastRegion;
