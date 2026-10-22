import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type ButtonRole = 'primary' | 'secondary' | 'quiet' | 'danger';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonRole;
  size?: 'regular' | 'large';
}

/** Home's action palette, wrapping labels, 44/48px targets and fine-pointer hover. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'regular', type = 'button', className = '', ...props }, ref,
) {
  return <button ref={ref} type={type} className={`action-button action-${variant} ${size === 'large' ? 'min-h-12' : 'min-h-11'} ${className}`} {...props} />;
});
