import { useEffect, useState } from "react";
import { registerToastHandler, type ToastType } from "./toastBus";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    registerToastHandler((id, message, type) => {
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3400);
    });
    return () => registerToastHandler(null);
  }, []);

  const colors: Record<ToastType, string> = {
    success: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
    error: "border-red-400/40 bg-red-500/15 text-red-100",
    warning: "border-amber-400/40 bg-amber-500/15 text-amber-100",
  };

  return (
    <div className="fixed bottom-10 right-4 z-[9999] flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${colors[toast.type]} rounded-md border px-3 py-2 text-xs font-medium shadow-xl backdrop-blur-sm`}
          role={toast.type === "error" ? "alert" : "status"}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
