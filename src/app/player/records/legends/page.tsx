import { redirect } from 'next/navigation';

// Legacy route - redirect to new stats route
export default function RecordsLegendsPage() {
  redirect('/player/stats/all-time/legends');
}
