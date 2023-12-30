export function scheduleAction(
  action: () => void | Promise<void>,
  delayMs: number
): Promise<void> {
  return new Promise(async (resolve) => {
    setTimeout(async () => {
      await action();
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
