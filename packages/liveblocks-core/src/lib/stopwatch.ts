interface StopWatch {
  start: () => void;
  lap: (now?: number) => void;
  stop: () => { total: number; laps: number[] };
}

export function makeStopWatch(): StopWatch {
  let starttime: number = 0;
  let lastLapTime: number = 0;
  let laps: number[];

  function start() {
    laps = [];
    starttime = performance.now();
    lastLapTime = starttime;
  }

  function lap(now = performance.now()) {
    laps.push(now - lastLapTime);
    lastLapTime = now;
  }

  function stop(): { total: number; laps: number[] } {
    const endtime = performance.now();
    lap(endtime);
    const total = endtime - starttime;
    return { total, laps };
  }

  return { start, lap, stop };
}
