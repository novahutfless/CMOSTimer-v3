
import { ScrambleType } from '../types';

const isOpposite = (a: number, b: number, type: ScrambleType): boolean => {
  if (type === ScrambleType.THREE || type === ScrambleType.TWO) {
     return Math.floor(a / 2) === Math.floor(b / 2) && a !== b;
  }
  return false; 
};

export const generateScramble = (type: ScrambleType = ScrambleType.THREE): string => {
  const moves333 = ['U', 'D', 'L', 'R', 'F', 'B'];
  const modifiers = ['', "'", '2'];
  
  let moves = moves333;
  let length = 20;

  if (type === ScrambleType.TWO) {
      moves = ['U', 'F', 'R']; 
      length = 9;
  } else if (type === ScrambleType.FOUR) {
      moves = [...moves333, 'Uw', 'Rw', 'Fw']; 
      length = 40;
  } else if (type === ScrambleType.FIVE) {
      moves = [...moves333, 'Uw', 'Rw', 'Fw', 'Lw', 'Dw', 'Bw'];
      length = 60;
  }

  const scramble: string[] = [];
  let lastMove = -1;
  let secondLastMove = -1;

  for (let i = 0; i < length; i++) {
    let moveIndex;
    do {
      moveIndex = Math.floor(Math.random() * moves.length);
    } while (
      moveIndex === lastMove || 
      (moveIndex === secondLastMove && isOpposite(moveIndex, lastMove, type)) 
    );
    const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
    scramble.push(moves[moveIndex] + modifier);
    secondLastMove = lastMove;
    lastMove = moveIndex;
  }
  return scramble.join(' ');
};
