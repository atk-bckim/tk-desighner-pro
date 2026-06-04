export type ToastType = "success" | "error" | "warning";

let toastId = 0;
let addToastFn: ((id: number, message: string, type: ToastType) => void) | null = null;

export function registerToastHandler(
  handler: ((id: number, message: string, type: ToastType) => void) | null,
) {
  addToastFn = handler;
}

export function showToast(message: string, type: ToastType = "success") {
  addToastFn?.(++toastId, message, type);
}
