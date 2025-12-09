import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  // Allow additional props like className, etc.
}

const StrongmanIcon: React.FC<IconProps> = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M19.5 10C19.5 10 21.36 10.61 21.84 12.06C22.31 13.5 21.5 15 21.5 15C21.5 15 20.21 18.59 16.56 19.78C12.91 20.97 10.97 19.92 9.5 19.5C9.5 19.5 7.5 21.5 5.5 21.5C3.5 21.5 2 20 2 18C2 16.5 3 15.5 4 15C3 14 2 12 3 10.5C4 9 5.5 8.5 6.5 9C6.5 9 8 5.5 11.5 4.5C15 3.5 17 5 17 5L15.5 9.5L19.5 10Z" />
    </svg>
  );
};

export default StrongmanIcon;
