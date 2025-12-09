/**
 * FireIcon - Alias for FlameIcon
 * 
 * This file provides backward compatibility for components that import FireIcon.
 * The new FlameIcon replaces the old strongman-based FireIcon.
 */

import FlameIcon from './FlameIcon.component';

export default FlameIcon;
export { default as FireIcon } from './FlameIcon.component';

