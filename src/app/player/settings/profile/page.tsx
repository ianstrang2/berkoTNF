'use client';
import ProfileSettings from '@/components/player/ProfileSettings.component';

export default function SettingsProfilePage() {
  return (
    <div className="flex flex-col w-full">
      <div className="min-w-0 max-w-3xl">
        <div className="flex flex-wrap -mx-3">
          <div className="w-full max-w-full px-3 flex-none">
            <ProfileSettings />
          </div>
        </div>
      </div>
    </div>
  );
}

