import React from 'react';
import { SvgXml } from 'react-native-svg';

const blueAvatar = `
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="16" cy="16" r="14" fill="url(#paint0_radial_33_1667)" stroke="white" stroke-width="3"/>
<defs>
<radialGradient id="paint0_radial_33_1667" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(-2.09756 -5) rotate(45.3703) scale(42.6232 37.1068)">
<stop stop-color="#002A95"/>
<stop offset="1" stop-color="#00A0D2"/>
</radialGradient>
</defs>
</svg>
`;

const purpleAvatar = `
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="16" cy="16" r="14" fill="url(#paint0_radial_33_1668)" stroke="white" stroke-width="3"/>
<defs>
<radialGradient id="paint0_radial_33_1668" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(-2.09756 -5) rotate(45.3703) scale(42.6232 37.1068)">
<stop stop-color="#6116FF"/>
<stop offset="1" stop-color="#E32DD1"/>
</radialGradient>
</defs>
</svg>
`;

const greenAvatar = `
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="16" cy="16" r="14" fill="url(#paint0_radial_35_1499)" stroke="white" stroke-width="3"/>
<defs>
<radialGradient id="paint0_radial_35_1499" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(-2.09756 -5) rotate(45.3703) scale(42.6232 37.1068)">
<stop stop-color="#39C7D1"/>
<stop offset="1" stop-color="#62CC52"/>
</radialGradient>
</defs>
</svg>
`;

export const BlueAvatar = () => <SvgXml xml={blueAvatar} />;
export const PurpleAvatar = () => <SvgXml xml={purpleAvatar} />;
export const GreenAvatar = () => <SvgXml xml={greenAvatar} />;