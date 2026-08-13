import { PluginUiNode, PluginUiSize, PluginUiTone } from '../../types';

const toneClasses: Record<PluginUiTone, string> = {
	default: 'text-zinc-200', muted: 'text-zinc-500', accent: 'text-blue-400', success: 'text-green-400', warning: 'text-yellow-400', danger: 'text-red-400'
};
const sizeClasses: Record<PluginUiSize, string> = { small: 'text-xs', medium: 'text-sm', large: 'text-xl font-semibold' };
const gaps = { small: 'gap-1', medium: 'gap-3', large: 'gap-6' } as const;
const aligns = { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' } as const;

export const renderPluginUi = (container: HTMLElement, root: PluginUiNode, onAction?: (action: string) => Promise<void>): (() => void) => {
	const cleanups: Array<() => void> = [];
	const build = (node: PluginUiNode): Node => {
		if (typeof node === 'string') return document.createTextNode(node);
		if (node.type === 'text') {
			const element = document.createElement('span');
			element.textContent = node.text;
			element.className = `${toneClasses[node.tone || 'default']} ${sizeClasses[node.size || 'medium']}`;
			return element;
		}
		if (node.type === 'button') {
			const button = document.createElement('button');
			button.type = 'button';
			button.textContent = node.text;
			button.disabled = node.disabled || !onAction;
			button.className = `px-3 py-2 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 ${toneClasses[node.tone || 'default']}`;
			const click = (): void => {
				if (!onAction) return;
				button.disabled = true;
				void onAction(node.action).catch(error => {
					console.error('[Plugin UI] Action failed:', error);
				}).finally(() => {
					button.disabled = Boolean(node.disabled);
				});
			};
			button.addEventListener('click', click);
			cleanups.push(() => button.removeEventListener('click', click));
			return button;
		}
		if (node.type === 'spacer') {
			const spacer = document.createElement('div');
			spacer.className = node.size === 'large' ? 'h-8 w-8' : node.size === 'medium' ? 'h-4 w-4' : 'h-2 w-2';
			return spacer;
		}
		const wrapper = document.createElement('div');
		wrapper.className = `flex ${node.direction === 'row' ? 'flex-row' : 'flex-col'} ${aligns[node.align || 'stretch']} ${gaps[node.gap || 'medium']}`;
		node.children.forEach(child => wrapper.appendChild(build(child)));
		return wrapper;
	};

	container.replaceChildren(build(root));
	return () => {
		cleanups.forEach(cleanup => cleanup());
		container.replaceChildren();
	};
};
