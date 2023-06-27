import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const ToastContext = createContext((str: string) => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);

  const addToast = useCallback(
    (text: string) => {
      const id = Math.random().toString(36).slice(-6);
      setToasts((prev) => [...prev, { id, text }]);
    },
    [setToasts]
  );

  const removeToast = useCallback(
    (id: string) => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    },
    [setToasts]
  );

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {toasts.map((toast, index) => (
        <Toast
          key={index}
          text={toast.text}
          offset={toasts.length - index}
          remove={() => removeToast(toast.id)}
        />
      ))}
    </ToastContext.Provider>
  );
}

function Toast({
  text,
  offset,
  remove,
}: {
  text: string;
  offset: number;
  remove: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(remove, 1500);
  }, []);

  return (
    <div className="toast" style={{ bottom: 50 * offset - 50 }} role="status">
      {text}
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
