export interface GlobeRevealGateState {
  readySignaled: boolean;
  initializationComplete: boolean;
  revealStarted: boolean;
  settled: boolean;
  failed: boolean;
}

export function createGlobeRevealGate(onReveal: () => void) {
  const state: GlobeRevealGateState = {
    readySignaled: false,
    initializationComplete: false,
    revealStarted: false,
    settled: false,
    failed: false,
  };

  const tryStartReveal = () => {
    if (
      state.settled
      || state.failed
      || state.revealStarted
      || !state.readySignaled
      || !state.initializationComplete
    ) return false;

    state.revealStarted = true;
    onReveal();
    return true;
  };

  return {
    signalReady() {
      if (state.settled || state.failed) return false;
      state.readySignaled = true;
      return tryStartReveal();
    },
    completeInitialization() {
      if (state.settled || state.failed) return false;
      state.initializationComplete = true;
      return tryStartReveal();
    },
    finishReveal() {
      if (state.settled || state.failed || !state.revealStarted) return false;
      state.settled = true;
      return true;
    },
    fail() {
      if (state.settled || state.failed) return false;
      state.failed = true;
      state.settled = true;
      return true;
    },
    getState(): GlobeRevealGateState {
      return { ...state };
    },
  };
}
