import { redirect } from 'next/navigation';

// Stats landing page redirects to Half Season by default
export default function StatsPage() {
  redirect('/player/stats/half');
}

