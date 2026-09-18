import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingModal } from '../../components/OnboardingModal';
import { Language } from '../../types';

describe('OnboardingModal', () => {
	it('renders an accessible first step with progress and navigation', () => {
		const markup = renderToStaticMarkup(<OnboardingModal language={Language.EN} onComplete={vi.fn()} />);

		expect(markup).toContain('role="dialog"');
		expect(markup).toContain('Welcome to CMOSTimer');
		expect(markup).toContain('Your timer is always ready');
		expect(markup).toContain('Onboarding progress');
		expect(markup).toContain('Next');
	});
});
