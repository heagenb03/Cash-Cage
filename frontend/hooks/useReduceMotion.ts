import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

let cachedValue = false;
let subscription: ReturnType<typeof AccessibilityInfo.addEventListener> | null = null;
const listeners = new Set<(value: boolean) => void>();

function subscribe(callback: (value: boolean) => void) {
  listeners.add(callback);

  if (listeners.size === 1) {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      cachedValue = enabled;
      listeners.forEach((cb) => cb(cachedValue));
    });

    subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      cachedValue = enabled;
      listeners.forEach((cb) => cb(cachedValue));
    });
  }

  return () => {
    listeners.delete(callback);

    if (listeners.size === 0 && subscription) {
      subscription.remove();
      subscription = null;
    }
  };
}

export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(cachedValue);

  useEffect(() => {
    return subscribe(setReduceMotion);
  }, []);

  return reduceMotion;
}
