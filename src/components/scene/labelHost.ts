/** The DOM node the scene moves under the hovered thing. Written by HoverLabel, read in useFrame. */
export const labelHost: { el: HTMLElement | null } = { el: null };

/** The DOM rect the homepage composition is framed into. Written by the hero, read by the camera rig. */
export const stageHost: { el: HTMLElement | null } = { el: null };
