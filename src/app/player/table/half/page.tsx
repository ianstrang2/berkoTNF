import { redirect } from 'next/navigation';

// Legacy route - redirect to new stats route
export default function TableHalfPage() {
  redirect('/player/stats/half');
}
