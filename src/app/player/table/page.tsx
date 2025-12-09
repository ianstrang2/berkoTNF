import { redirect } from 'next/navigation';

// Legacy route - redirect to new stats route
export default function TablePage() {
  redirect('/player/stats/half');
}
