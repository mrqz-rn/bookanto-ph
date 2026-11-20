"use client";

import * as React from "react";

/** The current time, ticking every 30 seconds. Starts at the server's time so both renders agree. */
export function useNow(initialIso?: string) {
  const [now, setNow] = React.useState(() =>
    initialIso ? new Date(initialIso).getTime() : Date.now(),
  );
  React.useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}
