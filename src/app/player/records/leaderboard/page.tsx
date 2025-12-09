import { redirect } from 'next/navigation';

// Legacy route - redirect to new stats route
export default function LeaderboardPage() {
  redirect('/player/stats/all-time/leaderboard');
}
