const PNG_MIME_TYPE = 'image/png';
const SVG_MIME_TYPE = 'image/svg+xml;charset=utf-8';

export const getPngFilename = (name: string): string => {
	const safeName = name
		.trim()
		.replace(/[\\/:*?"<>|]/g, '-')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');

	return `${safeName || 'chart'}.png`;
};

const loadImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
	const image = new Image();
	image.onload = (): void => resolve(image);
	image.onerror = (): void => reject(new Error('Failed to load chart image.'));
	image.src = url;
});

const createPngBlob = (canvas: HTMLCanvasElement): Promise<Blob> => new Promise((resolve, reject) => {
	canvas.toBlob((blob) => {
		if (blob) resolve(blob);
		else reject(new Error('Failed to create PNG image.'));
	}, PNG_MIME_TYPE);
});

/** Exports the SVG chart currently rendered inside a container as a PNG image. */
export const exportChartAsPng = async (container: HTMLElement, filename: string): Promise<void> => {
	const svg = container.querySelector<SVGSVGElement>('svg.recharts-surface');
	if (!svg) throw new Error('No chart image is available to export.');

	const bounds = svg.getBoundingClientRect();
	const width = Math.max(1, Math.round(bounds.width));
	const height = Math.max(1, Math.round(bounds.height));
	const cloned = svg.cloneNode(true) as SVGSVGElement;

	cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	cloned.setAttribute('width', String(width));
	cloned.setAttribute('height', String(height));
	cloned.setAttribute('viewBox', cloned.getAttribute('viewBox') || `0 0 ${width} ${height}`);

	const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
	background.setAttribute('width', '100%');
	background.setAttribute('height', '100%');
	background.setAttribute('fill', '#18181b');
	cloned.insertBefore(background, cloned.firstChild);

	const svgUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(cloned)], { type: SVG_MIME_TYPE }));
	try {
		const image = await loadImage(svgUrl);
		const scale = Math.min(window.devicePixelRatio || 1, 2);
		const canvas = document.createElement('canvas');
		canvas.width = width * scale;
		canvas.height = height * scale;

		const context = canvas.getContext('2d');
		if (!context) throw new Error('No canvas context is available.');
		context.scale(scale, scale);
		context.drawImage(image, 0, 0, width, height);

		const url = URL.createObjectURL(await createPngBlob(canvas));
		const link = document.createElement('a');
		link.href = url;
		link.download = getPngFilename(filename);
		link.click();
		URL.revokeObjectURL(url);
	} finally {
		URL.revokeObjectURL(svgUrl);
	}
};
