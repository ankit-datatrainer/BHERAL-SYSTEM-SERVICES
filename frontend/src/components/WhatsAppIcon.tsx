import React from 'react';

interface WhatsAppIconProps {
  size?: number;
  className?: string;
  color?: string;
  style?: React.CSSProperties;
}

/**
 * Scalable monochrome WhatsApp vector icon (inherits currentColor or custom color).
 */
export function WhatsAppIcon({ size = 20, className = '', color = 'currentColor', style }: WhatsAppIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      <path d="M17.472 14.382c-.301-.15-1.78-.879-2.056-.98-.276-.101-.477-.15-.678.15-.2.3-.777.98-.952 1.18-.175.2-.351.226-.652.076-.301-.15-1.272-.469-2.423-1.496-.897-.799-1.502-1.787-1.678-2.088-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.176.201-.301.301-.502.1-.201.05-.376-.025-.527-.075-.15-.678-1.633-.929-2.238-.244-.59-.493-.51-.678-.52l-.578-.01c-.201 0-.527.076-.803.377s-1.054 1.03-1.054 2.513c0 1.483 1.08 2.915 1.23 3.116.15.201 2.126 3.247 5.151 4.554.72.31 1.282.495 1.72.634.723.23 1.381.197 1.901.12.58-.087 1.78-.728 2.032-1.432.251-.704.251-1.307.176-1.432-.075-.126-.276-.201-.577-.352zM12 21.82c-1.77 0-3.5-.472-5.02-1.368l-.36-.214-3.73.978.995-3.638-.235-.374A9.78 9.78 0 0 1 2.22 12c0-5.39 4.39-9.78 9.78-9.78 5.39 0 9.78 4.39 9.78 9.78 0 5.39-4.39 9.78-9.78 9.78zm0-21.82C5.373 0 0 5.373 0 12c0 2.115.553 4.103 1.522 5.836L0 24l6.326-1.489C8.016 23.398 9.957 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  );
}

/**
 * Official circular WhatsApp badge with vibrant green circle and white handset.
 */
export function WhatsAppBadgeIcon({ size = 20, className = '', style }: WhatsAppIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      <circle cx="16" cy="16" r="16" fill="#25D366" />
      <path
        fill="#FFFFFF"
        d="M16.03 5C10 5 5.09 9.91 5.09 15.95c0 1.93.5 3.81 1.46 5.47L5 27l5.73-1.5c1.6.87 3.39 1.33 5.3 1.33 6.03 0 10.94-4.91 10.94-10.95C26.97 9.91 22.06 5 16.03 5zm6.39 15.54c-.27.76-1.35 1.4-1.89 1.48-.5.08-1.14.11-3.66-.93-3.23-1.33-5.3-4.63-5.46-4.85-.16-.22-1.31-1.74-1.31-3.32 0-1.58.83-2.36 1.12-2.68.29-.32.64-.4.85-.4.22 0 .43 0 .62.01.2.01.46-.07.72.55.27.64.91 2.22.99 2.38.08.16.14.35.03.56-.11.22-.16.35-.32.54-.16.19-.34.42-.49.56-.16.16-.33.33-.14.65.19.32.84 1.38 1.8 2.23 1.24 1.1 2.28 1.44 2.6 1.6.32.16.51.14.7-.08.19-.22.8-.93 1.01-1.25.21-.32.43-.27.72-.16.29.11 1.84.87 2.16 1.03.32.16.53.24.61.38.08.13.08.79-.19 1.55z"
      />
    </svg>
  );
}
