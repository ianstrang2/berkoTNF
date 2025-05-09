import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  // Allow additional props like className, etc.
}

const GrimReaperIcon: React.FC<IconProps> = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-20 0 190 190"
      fill="currentColor"
      {...props}
    >
      <path
        d="M49 56.2L45.7 52.62L42.9 54.18C45.72 63 53.06 71.57 62 80.28L70.34 72.63C70.34 72.63 71.79 59.81 85.72 52.85C97.91 58.4 101.89 72.69 101.89 72.69C98.89 78.9 90.81 82.47 90.81 82.47L104.17 107.55C102.9 110.35 100.17 112.85 97.88 114.55C104.29 121.79 109.55 129.35 112.42 137.38L108.3 139.29C91.3 97.4 49.91 91.82 33.3 47C47.63 35.66 98.45 27.13 116.64 48.26C91.66 42 60.86 49.49 49 56.2ZM55.88 86.43C68.68 99.08 83.36 108.6 95 122.57C96.51 135.08 102.09 147.48 102.09 147.48H57.32C57.32 147.48 65.72 133.01 65.72 109.08L51.79 106.48C54.4153 100.118 55.8002 93.3123 55.87 86.43H55.88Z"
      />
    </svg>
  );
};

export default GrimReaperIcon; 