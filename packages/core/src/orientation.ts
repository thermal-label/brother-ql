import type { RotateDirection } from '@thermal-label/contracts';

/**
 * Direction the Brother QL print head rotates landscape input.
 *
 * `90` = clockwise. Verified once on hardware with a die-cut "F"
 * landscape print (see plan §6 step 1). Identical across every QL
 * model — this is a print-head/leading-edge mechanical fact, not a
 * per-media setting.
 */
export const ROTATE_DIRECTION: RotateDirection = 90;
