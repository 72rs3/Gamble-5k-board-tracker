
import { useState, useEffect } from 'react';

export const useTimeUpdater = (intervalMs: number = 60000): Date => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTime(new Date());
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [intervalMs]);

  return time;
};
