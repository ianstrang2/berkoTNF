import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  // Allow additional props like className, etc.
}

const DonkeyIcon: React.FC<IconProps> = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M7 3L5 9C5 9 3 10 3 12C3 14 4.5 15 5.5 15L6 20C6 21 7 22 8 22H10C11 22 11.5 21 11.5 20V16H13C15 16 16.5 15 17 13L21 13C22 13 22.5 12 22 11C21.5 10 20.5 10 20 10H17C16.5 8 15 6 13 5L14 2H11L9.5 6L9 2H7ZM8.5 12C9.33 12 10 12.67 10 13.5C10 14.33 9.33 15 8.5 15C7.67 15 7 14.33 7 13.5C7 12.67 7.67 12 8.5 12Z" />
    </svg>
  );
};

export default DonkeyIcon;

