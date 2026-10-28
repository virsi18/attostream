import { usdToAttoPi, attoPiToUsd, formatFriendlyPi, UNITS } from './gcv-units.js';

/**
 * AttoStream Protocol Client
 * Simulates and interfaces with the $314,159 GCV AttoStream contracts
 */
export class AttoStreamClient {
  constructor(config = {}) {
    this.gcvRate = 314159;
    this.activeStreams = new Map();
    this.subscribers = new Set();
  }

  /**
   * Calculate per-second streaming rate for a given USD budget & duration
   * @param {number} totalUsdBudget Total USD value to stream
   * @param {number} durationSeconds Duration in seconds
   */
  calculateStreamPlan(totalUsdBudget, durationSeconds) {
    if (durationSeconds <= 0) throw new Error("Duration must be > 0 seconds");
    const totalAtto = usdToAttoPi(totalUsdBudget);
    const ratePerSecondAtto = totalAtto / BigInt(durationSeconds);
    const ratePerSecondUsd = totalUsdBudget / durationSeconds;

    return {
      totalUsdBudget,
      durationSeconds,
      totalAtto,
      ratePerSecondAtto,
      ratePerSecondUsd,
      formattedRate: `${formatFriendlyPi(ratePerSecondAtto)}/sec`,
      formattedTotal: formatFriendlyPi(totalAtto)
    };
  }

  /**
   * Instantiate a new live client-side streaming simulator
   */
  startStreamSimulator({ streamId, sender, recipient, usdBudget, durationSeconds, onTick }) {
    const plan = this.calculateStreamPlan(usdBudget, durationSeconds);
    const startTime = Date.now();
    const endTime = startTime + durationSeconds * 1000;

    const streamState = {
      streamId: streamId || `STREAM-${Math.floor(Math.random() * 90000 + 10000)}`,
      sender,
      recipient,
      plan,
      startTime,
      endTime,
      accumulatedAtto: 0n,
      withdrawnAtto: 0n,
      timer: null
    };

    streamState.timer = setInterval(() => {
      const now = Date.now();
      const elapsedSec = Math.min((now - startTime) / 1000, durationSeconds);
      const streamedAtto = BigInt(Math.floor(elapsedSec)) * plan.ratePerSecondAtto;
      streamState.accumulatedAtto = streamedAtto;

      const currentUsd = attoPiToUsd(streamedAtto);

      if (onTick) {
        onTick({
          streamId: streamState.streamId,
          elapsedSeconds: elapsedSec.toFixed(1),
          streamedAtto,
          formattedStreamed: formatFriendlyPi(streamedAtto),
          streamedUsd: currentUsd.toFixed(6),
          progressPercent: ((elapsedSec / durationSeconds) * 100).toFixed(2),
          isCompleted: elapsedSec >= durationSeconds
        });
      }

      if (elapsedSec >= durationSeconds) {
        clearInterval(streamState.timer);
      }
    }, 100);

    this.activeStreams.set(streamState.streamId, streamState);
    return streamState;
  }

  stopStream(streamId) {
    const s = this.activeStreams.get(streamId);
    if (s && s.timer) {
      clearInterval(s.timer);
      this.activeStreams.delete(streamId);
      return true;
    }
    return false;
  }
}
