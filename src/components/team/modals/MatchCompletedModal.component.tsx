import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui-kit/Button.component';

interface MatchCompletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
}

const MatchCompletedModal: React.FC<MatchCompletedModalProps> = ({
  isOpen,
  onClose,
  teamAName,
  teamBName,
  teamAScore,
  teamBScore
}) => {
  const router = useRouter();

  if (!isOpen) return null;

  const handleMatchReport = () => {
    // Simply navigate to dashboard (user mode)
    router.push('/');
    onClose();
  };

  const handleHistory = () => {
    // Navigate to admin history view
    router.push('/admin/matches?view=history');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity">
      <div className="bg-white rounded-xl shadow-soft-xl p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-700 font-sans mb-3">
            Match Saved Successfully
          </h2>
          
          <div className="text-lg font-semibold text-slate-600 mb-2">
            Final Score
          </div>
          
          <div className="text-2xl font-bold text-slate-800 mb-3">
            {teamAName} {teamAScore} - {teamBScore} {teamBName}
          </div>
          
          <p className="text-sm text-slate-500">
            Stats will recalculate in ~45 seconds
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            className="bg-gradient-to-tl from-purple-700 to-pink-500 shadow-soft-md rounded-lg w-full"
            onClick={handleMatchReport}
          >
            Match Report
          </Button>
          
          <Button
            variant="secondary"
            className="rounded-lg shadow-soft-sm w-full"
            onClick={handleHistory}
          >
            History
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MatchCompletedModal; 