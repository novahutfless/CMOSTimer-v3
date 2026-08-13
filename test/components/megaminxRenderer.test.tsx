import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MegaminxRenderer } from '../../components/scramble/MegaminxRenderer';
import { ScrambleImageConfig } from '../../types';
import { MegaminxPuzzle } from '../../utils/puzzles/megaminx';

describe('MegaminxRenderer', () => {
	it('renders all stickers with twelve distinct default face colours', () => {
		const markup = renderToStaticMarkup(<MegaminxRenderer state={MegaminxPuzzle.getInitialState()} />);
		const polygons = [...markup.matchAll(/<polygon\b[^>]*fill="([^"]+)"/g)];

		expect(polygons).toHaveLength(132);
		expect(new Set(polygons.map(match => match[1])).size).toBe(12);
	});

	it('maps the twelve configured colour slots onto distinct Megaminx faces', () => {
		const faceColors = Object.fromEntries(
			['U', 'R', 'F', 'D', 'L', 'B', 'face7', 'face8', 'face9', 'face10', 'face11', 'face12']
				.map((slot, index) => [slot, `rgb(${index}, ${index}, ${index})`])
		);
		const markup = renderToStaticMarkup(
			<MegaminxRenderer
				state={MegaminxPuzzle.getInitialState()}
				config={{ faceColors } as ScrambleImageConfig}
			/>
		);
		const fills = [...markup.matchAll(/<polygon\b[^>]*fill="([^"]+)"/g)].map(match => match[1]);

		expect(new Set(fills).size).toBe(12);
	});
});
