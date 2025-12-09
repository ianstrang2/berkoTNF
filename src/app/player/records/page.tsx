import { redirect } from 'next/navigation';

// Legacy route - redirect to new stats route
export default function RecordsPage() {
  redirect('/player/stats/all-time/leaderboard');
}
