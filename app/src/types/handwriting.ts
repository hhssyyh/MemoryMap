export type InkPoint = {
  x: number;
  y: number;
  pressure?: number;
  timestamp: number;
};

export type InkStroke = {
  id: string;
  points: InkPoint[];
  color: string;
  width: number;
};

export type HandwritingEngine = 'skia' | 'native';

export type HandwritingNote = {
  engine: HandwritingEngine;
  strokes: InkStroke[];
};
