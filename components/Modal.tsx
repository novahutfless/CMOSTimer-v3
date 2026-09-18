import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled]):not([type="hidden"])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])'
].join(',');

const modalStack: symbol[] = [];
let bodyLockCount = 0;
let previousBodyOverflow = '';

interface ModalProps {
	children: React.ReactNode;
	onClose: () => void;
	ariaLabel: string;
	className: string;
	overlayClassName?: string;
	closeOnBackdrop?: boolean;
}

/** Accessible modal shell shared by every blocking dialog in the application. */
export const Modal: React.FC<ModalProps> = ({
	children,
	onClose,
	ariaLabel,
	className,
	overlayClassName = 'bg-black/60 backdrop-blur-sm flex items-center justify-center z-50',
	closeOnBackdrop = true
}) => {
	const dialogRef = useRef<HTMLDivElement>(null);
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	useEffect(() => {
		const id = Symbol('modal');
		const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		modalStack.push(id);

		if (bodyLockCount === 0) {
			previousBodyOverflow = document.body.style.overflow;
			document.body.style.overflow = 'hidden';
		}
		bodyLockCount++;

		const dialog = dialogRef.current;
		if (dialog && !dialog.contains(document.activeElement)) {
			const initialFocus = dialog.querySelector<HTMLElement>('[data-autofocus], input, select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])');
			(initialFocus ?? dialog).focus();
		}

		const handleKeyDown = (event: KeyboardEvent): void => {
			if (modalStack.at(-1) !== id) return;
			if (event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				onCloseRef.current();
				return;
			}
			if (event.key !== 'Tab' || !dialogRef.current) return;

			const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
				.filter(element => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true');
			if (focusable.length === 0) {
				event.preventDefault();
				dialogRef.current.focus();
				return;
			}
			const first = focusable[0]!;
			const last = focusable[focusable.length - 1]!;
			if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};

		document.addEventListener('keydown', handleKeyDown, true);
		return (): void => {
			document.removeEventListener('keydown', handleKeyDown, true);
			const index = modalStack.lastIndexOf(id);
			if (index >= 0) modalStack.splice(index, 1);
			bodyLockCount--;
			if (bodyLockCount === 0) document.body.style.overflow = previousBodyOverflow;
			if (previouslyFocused?.isConnected) previouslyFocused.focus();
		};
	}, []);

	return (
		<div
			className={`fixed inset-0 ${overlayClassName}`}
			onMouseDown={(event): void => {
				if (closeOnBackdrop && event.target === event.currentTarget) onClose();
			}}
		>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-label={ariaLabel}
				tabIndex={-1}
				className={className}
			>
				{children}
			</div>
		</div>
	);
};

interface ModalCloseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	label?: string;
	size?: number;
}

export const ModalCloseButton: React.FC<ModalCloseButtonProps> = ({
	label = 'Close dialog',
	size = 20,
	className = 'text-zinc-500 hover:text-zinc-100',
	type = 'button',
	...props
}) => (
	<button type={type} aria-label={label} className={className} {...props}>
		<X size={size} aria-hidden="true" />
	</button>
);
