import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';

export interface UseApiResult<T> {
  data: T | undefined;
  loading: boolean;
  error: ApiError | undefined;
  reload(): void;
}

interface State<T> {
  data?: T;
  loading: boolean;
  error?: ApiError;
  /** Bu durumun hangi `deps` için olduğu. */
  deps: unknown[];
}

function sameDeps(a: unknown[], b: unknown[]): boolean {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
}

/**
 * `load` ilk çizimde ve `deps` değişince çalışır; `reload()` aynı isteği yeniden yapar.
 * `deps` değişince (örn. başka gün) eski verinin yerine hemen "yükleniyor" döner: eski günün
 * randevuları yeni tarihin altında görünmez. `reload()` sırasında ise eski veri ekranda kalır.
 * Eski ve yavaş gelen bir cevap, daha yeni bir istek başladıysa yok sayılır.
 */
export function useApi<T>(load: () => Promise<T>, deps: unknown[]): UseApiResult<T> {
  const [state, setState] = useState<State<T>>({ loading: true, deps });
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let current = true;
    setState((previous) =>
      sameDeps(previous.deps, deps) ? { data: previous.data, loading: true, deps } : { loading: true, deps },
    );
    loadRef.current().then(
      (data) => {
        if (current) setState({ data, loading: false, deps });
      },
      (error: unknown) => {
        if (!current) return;
        const apiError = error instanceof ApiError ? error : new ApiError(0, 'unknown', 'Bir şeyler ters gitti.');
        setState({ loading: false, error: apiError, deps });
      },
    );
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = () => setVersion((v) => v + 1);
  // `deps` değişti ama etki henüz çalışmadı: eski durumu gösterme.
  if (!sameDeps(state.deps, deps)) return { data: undefined, loading: true, error: undefined, reload };
  return { data: state.data, loading: state.loading, error: state.error, reload };
}
