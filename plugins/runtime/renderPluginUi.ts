import { PluginDeviceDescriptor, PluginDeviceRequest, PluginUiNode, PluginUiSize, PluginUiTone } from '../../types';

const toneClasses: Record<PluginUiTone, string> = {
	default: 'text-zinc-200', muted: 'text-zinc-500', accent: 'text-blue-400', success: 'text-green-400', warning: 'text-yellow-400', danger: 'text-red-400'
};
const sizeClasses: Record<PluginUiSize, string> = { small: 'text-xs', medium: 'text-sm', large: 'text-xl font-semibold' };
const gaps = { small: 'gap-1', medium: 'gap-3', large: 'gap-6' } as const;
const aligns = { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' } as const;

export const renderPluginUi = (container: HTMLElement, root: PluginUiNode, onAction?: (action: string, payload?: unknown) => Promise<void>, requestDevice?: (request: PluginDeviceRequest) => Promise<PluginDeviceDescriptor>): (() => void) => {
	const cleanups: Array<() => void> = [];
	const build = (node: PluginUiNode): Node => {
		if (typeof node === 'string') return document.createTextNode(node);
		if (node.type === 'text') {
			const element = document.createElement('span');
			element.textContent = node.text;
			element.className = `${toneClasses[node.tone || 'default']} ${sizeClasses[node.size || 'medium']}`;
			return element;
		}
		if (node.type === 'input') {
			const input = document.createElement('input');
			input.type = 'text';
			input.value = node.value;
			if (node.placeholder !== undefined) input.placeholder = node.placeholder;
			input.disabled = node.disabled || !onAction;
			input.className = 'w-full min-w-0 px-3 py-2 rounded border border-zinc-700 bg-zinc-950 text-zinc-200 placeholder:text-zinc-600 disabled:opacity-50';
			const change = (): void => {
				if (!onAction) return;
				void Promise.resolve(onAction(node.action, input.value)).catch(error => console.error('[Plugin UI] Input action failed:', error));
			};
			input.addEventListener('change', change);
			cleanups.push(() => input.removeEventListener('change', change));
			return input;
		}
		if (node.type === 'textarea') {
			const textarea = document.createElement('textarea');
			textarea.value = node.value;
			textarea.rows = node.rows || 4;
			if (node.placeholder !== undefined) textarea.placeholder = node.placeholder;
			textarea.disabled = node.disabled || !onAction;
			textarea.className = 'w-full min-w-0 px-3 py-2 rounded border border-zinc-700 bg-zinc-950 text-zinc-200 placeholder:text-zinc-600 disabled:opacity-50';
			const change = (): void => {
				if (onAction) void Promise.resolve(onAction(node.action, textarea.value)).catch(error => console.error('[Plugin UI] Textarea action failed:', error));
			};
			textarea.addEventListener('change', change);
			cleanups.push(() => textarea.removeEventListener('change', change));
			return textarea;
		}
		if (node.type === 'numberInput') {
			const input = document.createElement('input');
			input.type = 'number';
			input.value = String(node.value);
			if (node.min !== undefined) input.min = String(node.min);
			if (node.max !== undefined) input.max = String(node.max);
			if (node.step !== undefined) input.step = String(node.step);
			input.disabled = node.disabled || !onAction;
			input.className = 'w-full min-w-0 px-3 py-2 rounded border border-zinc-700 bg-zinc-950 text-zinc-200 disabled:opacity-50';
			const change = (): void => {
				if (onAction) void Promise.resolve(onAction(node.action, Number(input.value))).catch(error => console.error('[Plugin UI] Number input action failed:', error));
			};
			input.addEventListener('change', change);
			cleanups.push(() => input.removeEventListener('change', change));
			return input;
		}
		if (node.type === 'checkbox') {
			const label = document.createElement('label');
			label.className = 'flex items-center gap-2 text-sm text-zinc-300';
			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.checked = node.checked;
			checkbox.disabled = node.disabled || !onAction;
			const change = (): void => {
				if (onAction) void Promise.resolve(onAction(node.action, checkbox.checked)).catch(error => console.error('[Plugin UI] Checkbox action failed:', error));
			};
			checkbox.addEventListener('change', change);
			cleanups.push(() => checkbox.removeEventListener('change', change));
			label.append(checkbox, document.createTextNode(node.label));
			return label;
		}
		if (node.type === 'select') {
			const select = document.createElement('select');
			select.value = node.value;
			select.disabled = node.disabled || !onAction;
			select.className = 'w-full min-w-0 px-3 py-2 rounded border border-zinc-700 bg-zinc-950 text-zinc-200 disabled:opacity-50';
			node.options.forEach(option => {
				const element = document.createElement('option');
				element.value = option.value;
				element.textContent = option.label;
				select.appendChild(element);
			});
			select.value = node.value;
			const change = (): void => {
				if (!onAction) return;
				void Promise.resolve(onAction(node.action, select.value)).catch(error => console.error('[Plugin UI] Select action failed:', error));
			};
			select.addEventListener('change', change);
			cleanups.push(() => select.removeEventListener('change', change));
			return select;
		}
		if (node.type === 'tabs') {
			const wrapper = document.createElement('div');
			wrapper.className = 'flex flex-wrap gap-1';
			node.tabs.forEach(tab => {
				const button = document.createElement('button');
				button.type = 'button';
				button.textContent = tab.label;
				button.disabled = node.disabled || !onAction;
				button.className = `px-3 py-1.5 rounded text-xs border ${tab.value === node.value ? 'border-blue-500 bg-blue-500/20 text-blue-300' : 'border-zinc-700 bg-zinc-900 text-zinc-400'} disabled:opacity-50`;
				const click = (): void => {
					if (onAction) void Promise.resolve(onAction(node.action, tab.value)).catch(error => console.error('[Plugin UI] Tab action failed:', error));
				};
				button.addEventListener('click', click);
				cleanups.push(() => button.removeEventListener('click', click));
				wrapper.appendChild(button);
			});
			return wrapper;
		}
		if (node.type === 'button' || node.type === 'deviceButton') {
			const button = document.createElement('button');
			button.type = 'button';
			button.textContent = node.text;
			button.disabled = node.disabled || !onAction || (node.type === 'deviceButton' && !requestDevice);
			button.className = `px-3 py-2 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 ${toneClasses[node.tone || 'default']}`;
			const click = (): void => {
				if (!onAction) return;
				button.disabled = true;
				const action = node.type === 'deviceButton' && requestDevice
					? requestDevice(node.request).then(device => onAction(node.action, device))
					: onAction(node.action);
				void action.catch(error => {
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
		if (node.type === 'progress') {
			const wrapper = document.createElement('div');
			wrapper.className = 'flex w-full min-w-0 items-center gap-2';
			if (node.label !== undefined) {
				const label = document.createElement('span');
				label.textContent = node.label;
				label.className = `${toneClasses[node.tone || 'default']} text-xs shrink-0`;
				wrapper.appendChild(label);
			}
			const progress = document.createElement('progress');
			progress.max = node.max || 100;
			progress.value = node.value;
			progress.className = 'h-2 min-w-0 flex-1 accent-blue-500';
			wrapper.appendChild(progress);
			return wrapper;
		}
		if (node.type === 'table') {
			const table = document.createElement('table');
			table.className = `w-full text-xs text-zinc-300 ${node.compact ? ' [&_td]:py-1 [&_th]:py-1' : ''}`;
			const head = document.createElement('thead');
			const headRow = document.createElement('tr');
			headRow.className = 'border-b border-zinc-700 text-zinc-500';
			node.columns.forEach(column => {
				const cell = document.createElement('th'); cell.textContent = column.label; cell.className = `px-2 py-2 font-medium text-${column.align || 'left'}`; headRow.appendChild(cell);
			});
			head.appendChild(headRow);
			table.appendChild(head);
			const body = document.createElement('tbody');
			if (!node.rows.length) {
				const row = document.createElement('tr'); const cell = document.createElement('td'); cell.colSpan = node.columns.length; cell.textContent = node.emptyText || 'No data'; cell.className = 'px-2 py-3 text-zinc-500'; row.appendChild(cell); body.appendChild(row);
			}
			node.rows.forEach(data => {
				const row = document.createElement('tr'); row.className = 'border-b border-zinc-800/70'; node.columns.forEach(column => {
					const cell = document.createElement('td'); const content = data[column.key]; cell.textContent = content === null || content === undefined ? '' : String(content); cell.className = `px-2 py-2 text-${column.align || 'left'}`; row.appendChild(cell);
				}); body.appendChild(row);
			});
			table.appendChild(body);
			return table;
		}
		if (node.type === 'barChart') {
			const wrapper = document.createElement('div');
			wrapper.className = 'flex min-h-24 w-full items-end gap-2';
			const max = node.max || Math.max(1, ...node.data.map(point => point.value));
			node.data.forEach(point => {
				const column = document.createElement('div'); column.className = 'flex min-w-0 flex-1 flex-col items-center justify-end gap-1';
				if (node.showValues) {
					const value = document.createElement('span'); value.textContent = String(point.value); value.className = 'text-[10px] text-zinc-500'; column.appendChild(value);
				}
				const bar = document.createElement('div'); bar.title = `${point.label}: ${point.value}`; bar.style.height = `${Math.max(2, point.value / max * 100)}%`; bar.className = `w-full rounded-t bg-blue-500 ${point.tone === 'success' ? 'bg-green-500' : point.tone === 'warning' ? 'bg-yellow-500' : point.tone === 'danger' ? 'bg-red-500' : ''}`; column.appendChild(bar);
				const label = document.createElement('span'); label.textContent = point.label; label.className = 'max-w-full truncate text-[10px] text-zinc-500'; column.appendChild(label); wrapper.appendChild(column);
			});
			return wrapper;
		}
		if (node.type === 'lineChart') {
			const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			svg.setAttribute('viewBox', '0 0 400 140'); svg.setAttribute('preserveAspectRatio', 'none'); svg.classList.add('h-32', 'w-full');
			const values = node.data.map(point => point.value); const min = node.min ?? Math.min(0, ...values); const max = node.max ?? Math.max(1, ...values); const range = max - min || 1;
			const points = node.data.map((point, index) => `${node.data.length === 1 ? 200 : index / (node.data.length - 1) * 390 + 5},${135 - (point.value - min) / range * 125}`).join(' ');
			const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); polyline.setAttribute('points', points); polyline.setAttribute('fill', 'none'); polyline.setAttribute('stroke', '#60a5fa'); polyline.setAttribute('stroke-width', '3'); polyline.setAttribute('stroke-linecap', 'round'); polyline.setAttribute('stroke-linejoin', 'round'); svg.appendChild(polyline);
			return svg;
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
