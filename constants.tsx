import React from 'react';
import type { AspectRatio } from './types';
import { AspectRatio16x9Icon, AspectRatio9x16Icon, AspectRatio1x1Icon, AspectRatio4x3Icon, AspectRatio3x4Icon } from './components/Icon';

export const ASPECT_RATIOS: AspectRatio[] = [
  { label: 'Landscape', value: '16:9', icon: <AspectRatio16x9Icon className="w-5 h-5" /> },
  { label: 'Portrait', value: '9:16', icon: <AspectRatio9x16Icon className="w-5 h-5" /> },
  { label: 'Square', value: '1:1', icon: <AspectRatio1x1Icon className="w-5 h-5" /> },
  { label: 'Standard', value: '4:3', icon: <AspectRatio4x3Icon className="w-5 h-5" /> },
  { label: 'Social', value: '3:4', icon: <AspectRatio3x4Icon className="w-5 h-5" /> },
];

export const EDITING_FILTERS = [
    {
        name: 'Vintage',
        prompt: 'Apply a warm, faded vintage filter. Desaturate the colors slightly and add subtle grain and light leaks.'
    },
    {
        name: 'Noir',
        prompt: 'Convert the image to a high-contrast black and white noir style. Deepen the blacks and brighten the highlights to create a dramatic, moody atmosphere.'
    },
    {
        name: 'Vibrant',
        prompt: 'Boost the color saturation and vibrancy to make the image pop. Increase contrast for a more dynamic and energetic look.'
    },
    {
        name: 'Cinematic',
        prompt: 'Apply a cinematic color grade. Add a slight teal and orange look to the shadows and highlights. Add subtle cinematic letterboxing.'
    }
];
