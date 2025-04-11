import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string | number;
    isPositive: boolean;
  };
  icon: React.ReactNode;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, change, icon }) => {
  return (
    <div className="relative flex flex-col min-w-0 break-words bg-white dark:bg-gray-950 shadow-soft-xl dark:shadow-soft-dark-xl rounded-2xl bg-clip-border">
      <div className="flex-auto p-4">
        <div className="flex flex-wrap -mx-3">
          <div className="flex-none w-2/3 max-w-full px-3">
            <div>
              <p className="mb-0 font-sans font-semibold leading-normal text-sm dark:opacity-60">{title}</p>
              <h5 className="mb-0 font-bold dark:text-white">
                {value}
                {change && (
                  <span className={`leading-normal text-sm font-weight-bolder ${change.isPositive ? 'text-lime-500' : 'text-red-600'}`}>
                    &nbsp; {change.value}
                  </span>
                )}
              </h5>
            </div>
          </div>
          <div className="w-4/12 max-w-full px-3 text-right flex-0">
            <div className="inline-block w-12 h-12 text-center rounded-lg bg-gradient-to-tl from-purple-700 to-pink-500 shadow-soft-2xl">
              <div className="text-lg relative top-3.5 text-white">
                {icon}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCard; 