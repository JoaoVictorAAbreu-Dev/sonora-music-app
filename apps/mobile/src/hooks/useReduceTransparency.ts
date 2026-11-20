import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useSettings } from '@/features/settings/store';

/** iOS "Reduce Transparency" or the in-app setting (T18 "Reduzir transparência"). */
export function useReduceTransparency(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((v) => mounted && setEnabled(v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setEnabled);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  const app = useSettings((st) => st.reduceTransparency);
  return enabled || app;
}
