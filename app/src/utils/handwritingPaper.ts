export const HANDWRITING_PATTERN_SPACING = 48;

/**
 * Returns pattern positions in page-space, independent of the viewport scale.
 * Keeping this calculation in logical coordinates makes zooming and fitting a
 * page change only the rendered scale, not the paper's apparent grid density.
 */
export function getPatternPositions(
  logicalLength: number,
  spacing = HANDWRITING_PATTERN_SPACING,
): number[] {
  if (!Number.isFinite(logicalLength) || logicalLength <= 0) return [];
  if (!Number.isFinite(spacing) || spacing <= 0) return [];

  const count = Math.max(0, Math.ceil(logicalLength / spacing) - 1);
  return Array.from({ length: count }, (_, index) => (index + 1) * spacing);
}
