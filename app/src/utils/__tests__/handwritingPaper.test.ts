import { getPatternPositions, HANDWRITING_PATTERN_SPACING } from '../handwritingPaper';

describe('handwriting paper patterns', () => {
  it('uses page-space positions instead of viewport pixels', () => {
    expect(getPatternPositions(120)).toEqual([
      HANDWRITING_PATTERN_SPACING,
      HANDWRITING_PATTERN_SPACING * 2,
    ]);

    // A viewport resize does not participate in the calculation. The same
    // logical page therefore keeps the same line and dot locations.
    expect(getPatternPositions(120)).toEqual(getPatternPositions(120));
  });

  it('does not emit a pattern point on or beyond the page edge', () => {
    expect(getPatternPositions(96, 48)).toEqual([48]);
    expect(getPatternPositions(97, 48)).toEqual([48, 96]);
    expect(getPatternPositions(0)).toEqual([]);
  });
});
