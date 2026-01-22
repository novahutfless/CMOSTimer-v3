import React, { useEffect, useRef } from 'react';

const Fireworks: React.FC = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		const particles: Particle[] = [];
		const colors = ['#F04', '#0F4', '#40F', '#FF0', '#0FF', '#F0F'];

		class Particle {
			x: number;
			y: number;
			vx: number;
			vy: number;
			alpha: number;
			color: string;

			constructor(x: number, y: number) {
				this.x = x;
				this.y = y;
				const angle = Math.random() * Math.PI * 2;
				const speed = Math.random() * 5 + 2;
				this.vx = Math.cos(angle) * speed;
				this.vy = Math.sin(angle) * speed;
				this.alpha = 1;
				this.color = colors[Math.floor(Math.random() * colors.length)];
			}

			update(): void {
				this.x += this.vx;
				this.y += this.vy;
				this.vy += 0.1; // gravity
				this.alpha -= 0.015;
			}

			draw(ctx: CanvasRenderingContext2D): void {
				ctx.globalAlpha = this.alpha;
				ctx.fillStyle = this.color;
				ctx.beginPath();
				ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		const createFirework = (): void => {
			const x = Math.random() * canvas.width;
			const y = Math.random() * (canvas.height / 2);
			for (let i = 0; i < 50; i++) 
				particles.push(new Particle(x, y));      
		};

		// Initial bursts
		createFirework();
		setTimeout(createFirework, 200);
		setTimeout(createFirework, 400);

		let animId: number;
		const loop = (): void => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
      
			for (let i = particles.length - 1; i >= 0; i--) {
				particles[i].update();
				particles[i].draw(ctx);
				if (particles[i].alpha <= 0) 
					particles.splice(i, 1);        
			}

			if (particles.length > 0) 
				animId = requestAnimationFrame(loop);      
		};

		loop();

		return (): void => {
			if(animId)
				cancelAnimationFrame(animId);
		};
	}, []);

	return (
		<canvas 
			ref={canvasRef}
			className="fixed inset-0 pointer-events-none z-50"
		/>
	);
};

export default Fireworks;
