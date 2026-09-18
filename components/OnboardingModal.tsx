import React, { useState } from 'react';
import { BarChart3, Command, LayoutGrid, ShieldCheck, TimerReset } from 'lucide-react';
import { Language } from '../types';
import { t } from '../translations';
import { Modal } from './Modal';

interface Props {
	language: Language;
	onComplete: () => void;
}

const steps = [
	{ icon: TimerReset, title: 'onboarding.timer.title', body: 'onboarding.timer.body' },
	{ icon: Command, title: 'onboarding.sessions.title', body: 'onboarding.sessions.body' },
	{ icon: LayoutGrid, title: 'onboarding.customize.title', body: 'onboarding.customize.body' },
	{ icon: BarChart3, title: 'onboarding.insights.title', body: 'onboarding.insights.body' },
	{ icon: ShieldCheck, title: 'onboarding.data.title', body: 'onboarding.data.body' },
] as const;

export const OnboardingModal: React.FC<Props> = ({ language, onComplete }) => {
	const [step, setStep] = useState(0);
	const current = steps[step]!;
	const Icon = current.icon;
	const lastStep = step === steps.length - 1;

	return (
		<Modal
			ariaLabel={t('onboarding.title', language)}
			onClose={onComplete}
			closeOnBackdrop={false}
			overlayClassName="z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
			className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
		>
			<div className="h-1 bg-zinc-800" aria-hidden="true">
				<div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
			</div>
			<div className="p-6 sm:p-8">
				<div className="mb-6 flex items-start justify-between gap-4">
					<div>
						<p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-400">{t('onboarding.eyebrow', language)}</p>
						<h2 className="text-2xl font-black text-zinc-100">{t('onboarding.title', language)}</h2>
					</div>
					<button type="button" onClick={onComplete} className="text-sm text-zinc-500 hover:text-zinc-200">
						{t('onboarding.skip', language)}
					</button>
				</div>

				<div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 text-center" aria-live="polite">
					<div className="mb-5 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-blue-400">
						<Icon size={36} aria-hidden="true" />
					</div>
					<h3 className="text-xl font-bold text-zinc-100">{t(current.title, language)}</h3>
					<p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">{t(current.body, language)}</p>
				</div>

				<div className="mt-6 flex items-center gap-2" aria-label={t('onboarding.progress', language)}>
					{steps.map((_, index) => (
						<button
							key={index}
							type="button"
							onClick={() => setStep(index)}
							aria-label={`${index + 1} / ${steps.length}`}
							aria-current={index === step ? 'step' : undefined}
							className={`h-2 flex-1 rounded-full transition-colors ${index === step ? 'bg-blue-500' : index < step ? 'bg-blue-900' : 'bg-zinc-800'}`}
						/>
					))}
				</div>

				<div className="mt-6 flex justify-between gap-3">
					<button
						type="button"
						disabled={step === 0}
						onClick={() => setStep(previous => Math.max(0, previous - 1))}
						className="rounded-lg px-4 py-2 text-sm font-bold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:invisible"
					>
						{t('onboarding.back', language)}
					</button>
					<button
						type="button"
						onClick={() => lastStep ? onComplete() : setStep(previous => previous + 1)}
						className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-500"
					>
						{t(lastStep ? 'onboarding.finish' : 'onboarding.next', language)}
					</button>
				</div>
			</div>
		</Modal>
	);
};
