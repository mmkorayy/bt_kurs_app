import { act, renderHook, waitFor } from '@testing-library/react';
import { ApiError } from '../api/client';
import { useApi } from './useApi';

test('starts loading, then gives the data', async () => {
  const { result } = renderHook(() => useApi(async () => 'merhaba', []));
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toBe('merhaba');
  expect(result.current.error).toBeUndefined();
});

test('a failing load gives the ApiError and no data', async () => {
  const { result } = renderHook(() =>
    useApi(async () => {
      throw new ApiError(500, 'server_error', 'Sunucu hatası.');
    }, []),
  );
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error?.message).toBe('Sunucu hatası.');
  expect(result.current.data).toBeUndefined();
});

test('reload runs the load again', async () => {
  let count = 0;
  const { result } = renderHook(() => useApi(async () => ++count, []));
  await waitFor(() => expect(result.current.data).toBe(1));
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.data).toBe(2));
});

test('changing the dependencies loads again and an old slow answer is ignored', async () => {
  const resolvers: Record<string, (v: string) => void> = {};
  const load = (key: string) => new Promise<string>((resolve) => (resolvers[key] = resolve));
  const { result, rerender } = renderHook(({ key }) => useApi(() => load(key), [key]), { initialProps: { key: 'a' } });
  rerender({ key: 'b' });
  await act(async () => {
    resolvers.b('B');
  });
  await act(async () => {
    resolvers.a('A');
  });
  expect(result.current.data).toBe('B');
});
