import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Modal, ModalCloseButton } from '../../components/Modal';

describe('Modal', () => {
	it('exposes dialog semantics and an accessible name', () => {
		const markup = renderToStaticMarkup(
			<Modal ariaLabel="Example dialog" onClose={vi.fn()} className="panel">
				<p>Content</p>
			</Modal>
		);

		expect(markup).toContain('role="dialog"');
		expect(markup).toContain('aria-modal="true"');
		expect(markup).toContain('aria-label="Example dialog"');
		expect(markup).toContain('tabindex="-1"');
	});

	it('gives its close control a configurable accessible label', () => {
		const markup = renderToStaticMarkup(<ModalCloseButton label="Close example" />);

		expect(markup).toContain('type="button"');
		expect(markup).toContain('aria-label="Close example"');
		expect(markup).toContain('aria-hidden="true"');
	});
});
