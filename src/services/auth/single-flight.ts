export function createSingleFlight<T>() {
  let pending: Promise<T> | null = null;
  return {
    run(task: () => Promise<T>): Promise<T> {
      pending ??= task().finally(() => { pending = null; });
      return pending;
    },
  };
}
