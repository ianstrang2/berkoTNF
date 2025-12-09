import { redirect } from 'next/navigation';

// Legacy route - redirect to new stats route
export default function FeatsPage() {
  redirect('/player/stats/all-time/feats');
}
