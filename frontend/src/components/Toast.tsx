import { useEffect, useState } from "react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error" | "warning";
}

let toastId = 0;
let addToastFn: ((message: string, type: ToastItem["type"]) => void) | null = null;

export function showToast(message: string, type: ToastItem["type"] = "success") {
  addToastFn?.(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    addToastFn = (message, type) => {
      const id = ++toastId;
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };
    return () => { addToastFn = null; };
  }, []);

  const colors = {
    success: "bg-[#10b981] text-white",
    error: "bg-[#ef4444] text-white",
    warning: "bg-[#f59e0b] text-black",
  };

  return (
    <div className="fixed bottom-8 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`${colors[t.type]} px-4 py-2 rounded shadow-lg text-xs font-medium animate-[fadeIn_0.2s_ease-out]`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
