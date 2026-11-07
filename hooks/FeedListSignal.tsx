import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

// Tells the Feed that a Refresh saved a new list. Refresh and Feed are
// separate tabs, and both stay mounted, so the Feed can't learn it from its
// own button any more. A counter in context is enough; no state library.

type FeedListSignal = {
  /** Goes up each time a Refresh saves a new list. Starts at 0. */
  savedCount: number;
  markListSaved: () => void;
};

const SignalContext = createContext<FeedListSignal | null>(null);

export function FeedListSignalProvider({ children }: { children: ReactNode }) {
  const [savedCount, setSavedCount] = useState(0);
  const markListSaved = useCallback(() => setSavedCount((count) => count + 1), []);
  const value = useMemo(() => ({ savedCount, markListSaved }), [savedCount, markListSaved]);
  return <SignalContext.Provider value={value}>{children}</SignalContext.Provider>;
}

export function useFeedListSignal(): FeedListSignal {
  const signal = useContext(SignalContext);
  if (signal === null) {
    throw new Error('useFeedListSignal must be used inside FeedListSignalProvider');
  }
  return signal;
}
