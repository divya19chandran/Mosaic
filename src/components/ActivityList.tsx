import type { Activity } from '../types';
import ActivityCard from './ActivityCard';

export default function ActivityList({
  activities,
  onOpen,
  emptyMessage,
}: {
  activities: Activity[];
  onOpen: (id: string) => void;
  emptyMessage?: string;
}) {
  if (activities.length === 0) {
    return (
      <div className="py-10 text-center text-[13px] text-[color:var(--color-ink-soft)]">
        {emptyMessage ?? 'Nothing here yet. Paste a link or add one manually to get started.'}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {activities.map((a) => (
        <ActivityCard key={a.id} activity={a} onOpen={onOpen} />
      ))}
    </div>
  );
}
