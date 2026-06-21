import { useEffect, useRef } from "react";

export function useVisibility() {
  const isVisibleRef = useRef(true);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const requestAnimationFrame = (callback: () => void) => {
    if (!isVisibleRef.current) {
      return;
    }
    animationFrameRef.current = window.requestAnimationFrame(callback);
  };

  const cancelAnimationFrame = () => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }
  };

  return {
    isVisible: isVisibleRef.current,
    requestAnimationFrame,
    cancelAnimationFrame,
  };
}
