export const getMultiBlindReminderMs = (attemptedCubes: number): number =>
	Math.min(60, Math.max(1, Math.round(attemptedCubes)) * 10) * 60_000;

let audioContext: AudioContext | null = null;

export const prepareTimerBeep = (): void => {
	try {
		const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!AudioContextClass) return;
		audioContext ||= new AudioContextClass();
		if (audioContext.state === 'suspended') void audioContext.resume();
	} catch {
		// Audio is optional and must never interfere with timing.
	}
};

export const playTimerBeep = (): void => {
	try {
		prepareTimerBeep();
		const context = audioContext;
		if (!context) return;
		const oscillator = context.createOscillator();
		const gain = context.createGain();
		oscillator.frequency.value = 880;
		gain.gain.setValueAtTime(0.18, context.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.7);
		oscillator.connect(gain);
		gain.connect(context.destination);
		oscillator.start();
		oscillator.stop(context.currentTime + 0.7);
	} catch {
		// Audio may be blocked; timing must continue uninterrupted.
	}
};
