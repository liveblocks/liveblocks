interface StopWatch {
  start: () => void;
  lap: (now?: number) => void;
  stop: () => { total: number; laps: number[] };
}

export function makeStopWatch(): StopWatch {
  let startTime = 0;
  let lastLapTime = 0;
  let laps: number[];

  function start() {
    laps = [];
    startTime = performance.now();
    lastLapTime = startTime;
  }

  function lap(now = performance.now()) {
    laps.push(now - lastLapTime);
    lastLapTime = now;
  }

  function stop(): { total: number; laps: number[] } {
    const endTime = performance.now();
    lap(endTime);
    const total = endTime - startTime;
    return { total, laps };
  }

  return { start, lap, stop };
}
