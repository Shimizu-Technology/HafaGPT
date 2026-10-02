/** Bound markdown work to 20 updates/sec without losing the final text. */
export function createStreamTextBatcher(onText: (chunk: string, fullContent: string) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = '';
  let fullContent = '';
  const flush = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (!pending) return;
    const chunk = pending;
    pending = '';
    onText(chunk, fullContent);
  };
  return {
    append(chunk: string) {
      pending += chunk;
      fullContent += chunk;
      if (timer === undefined) timer = setTimeout(flush, 50);
    },
    flush,
    cancel() {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      pending = '';
    },
  };
}
