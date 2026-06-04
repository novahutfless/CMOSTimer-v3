export interface StackmatState {
    time_milli: number;
    on: boolean;
    greenLight: boolean;
    leftHand: boolean;
    rightHand: boolean;
    running: boolean;
    unknownRunning: boolean;
    signalHeader: string;
}

// Converted from the provided JS IIFE
export const Stackmat = (function(): { init: (cb: (state: StackmatState) => void) => void; stop: () => void } {
	//========== Hardware Part ==========
	let audio_context: AudioContext | null = null;
	let audio_stream: MediaStream | undefined;
	let source: MediaStreamAudioSourceNode | undefined;
	let node: ScriptProcessorNode | undefined;
	let sample_rate = 0;

	let callback: (state: StackmatState) => void = () => {};

	function init(cb: (state: StackmatState) => void): void {
		callback = cb;
		type LegacyGetUserMedia = (
			constraints: MediaStreamConstraints,
			successCallback: (stream: MediaStream) => void,
			errorCallback: (error: unknown) => void
		) => void;
		const getUserMedia = (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ||
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
            (navigator as any).getUserMedia ||
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
            (navigator as any).webkitGetUserMedia ||
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
            (navigator as any).mozGetUserMedia ||
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
            (navigator as any).msGetUserMedia as LegacyGetUserMedia | undefined;

		if (!getUserMedia) {
			console.error("getUserMedia not supported");
			return;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const AC = (window.AudioContext || (window as any).webkitAudioContext);
		if (!AC) return;

		audio_context = new AC();
		sample_rate = audio_context.sampleRate / 1200;

		edgeIdxDiff = Math.ceil(sample_rate / 6);
		// Initialize buffer
		lastVal = new Array(edgeIdxDiff).fill(0);

		if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) 
			navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: false,
					noiseSuppression: false,
					autoGainControl: false
				}
			}).then(success).catch(e => console.error(e));
		else 
			(getUserMedia as LegacyGetUserMedia)({
				audio: {
					echoCancellation: false,
					noiseSuppression: false
				}
			}, success, function(e: unknown) {
				console.error(e); 
			});
        
	}

	function stop(): void {
		if (audio_stream && audio_context) {
			if (source && node) {
				source.disconnect(node);
				node.disconnect(audio_context.destination);
			}
			audio_stream.getTracks().forEach(t => t.stop());
			audio_stream = undefined;
			audio_context.close();
			audio_context = null;
		}
		// Reset state
		stackmat_state = { ...DEFAULT_STATE };
	}

	let pwr_list = [0, 0, 0, 0, 0, 0, 0, 0, 0];
	let last_gain = 1;

	function success(stream: MediaStream): void {
		if (!audio_context) return;
		audio_stream = stream;
		source = audio_context.createMediaStreamSource(stream);
		node = audio_context.createScriptProcessor(1024, 1, 1);

		node.onaudioprocess = function(e): void {
			const input = e.inputBuffer.getChannelData(0);
            
			// AGC (Automatic Gain Control)
			let power = 0;
			for (let i = 0; i < input.length; i++) 
				power += input[i]! * input[i]!;
            
			power = Math.sqrt(power / input.length);
			pwr_list.push(power);
			let sum = 0;
			for (let i = 0; i < pwr_list.length; i++) 
				sum += pwr_list[i]!;
            
			sum /= pwr_list.length;
			const fix = Math.min(100, 1 / (sum || 0.001));

			const cur_gain = Math.min(last_gain * 0.8 + fix * 0.2, fix);

			for (let i = 0; i < input.length; i++) 
				procSignal(input[i]! * (last_gain + (cur_gain - last_gain) * (i / input.length)));
            
			last_gain = cur_gain;
			pwr_list = pwr_list.slice(1);
		};
		source.connect(node);
		node.connect(audio_context.destination);
	}

	//========== Audio2Bits Part ==========
	let lastVal: number[] = [];
	let lastSgn = 0;
	let edgeIdxDiff = 0;
	const THRESHOLD_SCHM = 0.2;
	const THRESHOLD_EDGE = 0.7;
	let lenVoltageKeep = 0;

	function procSignal(signal: number): void {
		lastVal.unshift(signal);
		if (lastVal.length > edgeIdxDiff + 1) lastVal.pop();
        
		const prev = lastVal[edgeIdxDiff] || 0;
		const isEdge = Math.abs(prev - signal) > THRESHOLD_EDGE;

		const diff = Math.abs(signal - (lastSgn ? 1 : -1)) - 1;
		if (isEdge && diff > THRESHOLD_SCHM && lenVoltageKeep > sample_rate * 0.6) {
			const bits = Math.round(lenVoltageKeep / sample_rate);
			for (let i = 0; i < bits; i++) 
				appendBit(lastSgn);
            
			lastSgn ^= 1;
			lenVoltageKeep = 0;
		} else if (lenVoltageKeep > sample_rate * 6) {
			for (let i = 0; i < 5; i++) 
				appendBit(lastSgn);
            
			lenVoltageKeep -= sample_rate * 5;
		}

		lenVoltageKeep++;
	}


	//========== Bits Analyzer ==========
	let bitBuffer: number[] = [];
	let byteBuffer: string[] = [];
	let idle_val = 0;
	let last_bit = 0;
	let last_bit_length = 0;

	function appendBit(bit: number): void {
		bitBuffer.push(bit);
		if (bit !== last_bit) {
			last_bit = bit;
			last_bit_length = 1;
		} else {
			last_bit_length++;
		}
		if (last_bit_length > 10) { //IDLE
			idle_val = bit;
			bitBuffer = [];

			if (byteBuffer.length !== 0) 
				byteBuffer = [];
            

			if (last_bit_length > 100 && stackmat_state.on) {
				stackmat_state.on = false;
				callback(stackmat_state);
			} else if (last_bit_length > 700) {
				last_bit_length = 100;
				callback(stackmat_state);
			}
		} else {
			if (bitBuffer.length === 10) 
				if (bitBuffer[0] === idle_val || bitBuffer[9] !== idle_val) {
					bitBuffer = bitBuffer.slice(1);
				} else {
					let val = 0;
					for (let i = 8; i > 0; i--) 
						val = (val << 1) | (bitBuffer[i] === idle_val ? 1 : 0);
                    
					byteBuffer.push(String.fromCharCode(val));
					decode(byteBuffer);
					bitBuffer = [];
				}
		}
	}

	function decode(buffer: string[]): void {
		if (buffer.length !== 9 && buffer.length !== 10) 
			return;
        
		const re_head = /[ SILRCA]/;
		const re_number = /\d/;
		const head = buffer[0];
		if (!re_head.exec(head)) 
			return;
        
		let time_milli = 0;
		let checksum = 64;
        
		if (buffer.length === 9) {
			for (let i = 1; i < 6; i++) {
				if (!re_number.exec(buffer[i])) return;
				checksum += parseInt(buffer[i]);
			}
			if (checksum !== buffer[6].charCodeAt(0)) return;
            
			time_milli = parseInt(buffer[1]) * 60000 + 
                         parseInt(buffer[2] + buffer[3]) * 1000 + 
                         parseInt(buffer[4] + buffer[5]) * 10;
		} else if (buffer.length === 10) {
			for (let i = 1; i < 7; i++) {
				if (!re_number.exec(buffer[i])) return;
				checksum += parseInt(buffer[i]);
			}
			if (checksum !== buffer[7].charCodeAt(0)) return;
            
			time_milli = parseInt(buffer[1]) * 60000 + 
                         parseInt(buffer[2] + buffer[3]) * 1000 + 
                         parseInt(buffer[4] + buffer[5] + buffer[6]);
		}

		const new_state: StackmatState = {
			time_milli: time_milli,
			on: true,
			greenLight: head === 'A',
			leftHand: head === 'L' || head === 'A' || head === 'C',
			rightHand: head === 'R' || head === 'A' || head === 'C',
			running: (head !== 'S' || stackmat_state.signalHeader === 'S') && (head === ' ' || time_milli > stackmat_state.time_milli),
			signalHeader: head,
			unknownRunning: !stackmat_state.on
		};

		// Correction for running logic
		if (head === 'S' && stackmat_state.signalHeader !== 'S') 
		// Usually S means Stopped.
			new_state.running = false;
		else if (head === ' ' && (stackmat_state.signalHeader === 'I' || stackmat_state.signalHeader === 'S')) 
		// Space usually means running in some gens, or just blank.
		// If time is increasing it is running.
			if (new_state.time_milli > stackmat_state.time_milli)
				new_state.running = true;
        
		stackmat_state = new_state;
		callback(stackmat_state);
	}

	const DEFAULT_STATE: StackmatState = {
		time_milli: 0,
		on: false,
		greenLight: false,
		leftHand: false,
		rightHand: false,
		running: false,
		unknownRunning: true,
		signalHeader: 'I'
	};

	let stackmat_state = { ...DEFAULT_STATE };

	return {
		init: init,
		stop: stop
	};
})();
