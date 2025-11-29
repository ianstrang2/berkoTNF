'use client';
import SecurityTab from '@/components/player/SecurityTab.component';

export default function SettingsSecurityPage() {
  return (
    <div className="flex flex-col w-full">
      <div className="min-w-0 max-w-3xl">
        <div className="flex flex-wrap -mx-3">
          <div className="w-full max-w-full px-3 flex-none">
            <SecurityTab />
          </div>
        </div>
      </div>
    </div>
  );
}

