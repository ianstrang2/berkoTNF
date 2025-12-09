import { redirect } from 'next/navigation';

// All Time landing page redirects to Leaderboard by default
export default function AllTimePage() {
  redirect('/player/stats/all-time/leaderboard');
}

