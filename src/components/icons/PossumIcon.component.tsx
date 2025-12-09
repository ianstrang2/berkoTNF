import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  // Allow additional props like className, etc.
}

const PossumIcon: React.FC<IconProps> = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M12 4C8.5 4 5.5 6 4 9C3 11 3.5 13 5 14.5C4 15.5 3.5 17 4 18.5C4.5 20 6 21 7.5 21C10 21 11.5 19 12 18C15 18 17.5 16.5 19 14C20 12.5 20.5 10.5 19.5 9C19 8.2 18 7.5 17 7.5C18.5 6 18 3.5 16 3C14.5 2.6 13 3 12 4ZM8 17.5C7.2 17.5 6.5 16.8 6.5 16C6.5 15.2 7.2 14.5 8 14.5C8.8 14.5 9.5 15.2 9.5 16C9.5 16.8 8.8 17.5 8 17.5Z" />
    </svg>
  );
};

export default PossumIcon;

