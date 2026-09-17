import { ComputedSolve } from '../../types';
import { Subsession } from '../../utils/subsessions';

export interface ProcessedSolve {
  solve: ComputedSolve;
  originalIndex: number;
}

export type TimeListItem =
  | { kind: 'solve'; item: ProcessedSolve }
  | { kind: 'subsession'; group: Subsession<ComputedSolve>; items: ProcessedSolve[]; expanded: boolean };
