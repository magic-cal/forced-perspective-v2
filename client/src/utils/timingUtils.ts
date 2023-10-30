export function scheduleAction(
  action: () => void,
  delayMs: number
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      action();
      resolve();
    }, delayMs);
  });
}

export const scheduleActionLoop = (
  action: () => void,
  delayMs: number,
  loopCount: number
) => {
  for (let i = 0; i < loopCount; i++) {
    setTimeout(action, delayMs * i);
  }
};
