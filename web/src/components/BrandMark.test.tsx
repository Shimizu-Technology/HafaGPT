import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandMark } from './BrandMark';

describe('BrandMark', () => {
  it('draws the decorative hibiscus without exposing it to assistive technology', () => {
    const { container } = render(<BrandMark />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg?.querySelectorAll('path').length).toBeGreaterThanOrEqual(5);
  });

  it('keeps the seasonal emoji for holiday themes', () => {
    expect(render(<BrandMark seasonal="christmas" />).container).toHaveTextContent('🎄');
    expect(render(<BrandMark seasonal="newyear" />).container).toHaveTextContent('🎆');
  });
});
