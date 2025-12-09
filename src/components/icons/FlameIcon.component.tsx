import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  // Allow additional props like className, etc.
}

const FlameIcon: React.FC<IconProps> = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M12 2C10.5 3.5 8 6 8 9C8 10.5 8.5 11.5 9 12.5C7 12 6 10.5 6 9C4.5 9.5 3 11 3 13.5C3 17.5 6.5 21 10.5 21C15 21 18 18 18 14.5C18 11.5 16 9 14.5 8C15 9.5 15 11 14.5 12C14.5 12 16.5 9.5 16.5 7C16.5 5 15 3.5 14 2.5C13.5 2 12.5 1.5 12 2Z" />
    </svg>
  );
};

export default FlameIcon;

