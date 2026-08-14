import type { SourceMeta, SourceSite } from '../types';

export const SOURCES: SourceMeta[] = [
  { id: 'eventbrite', label: 'Eventbrite' },
  { id: 'dice', label: 'Dice' },
  { id: 'residentadvisor', label: 'Resident Advisor' },
  { id: 'bucketlisters', label: 'Bucket Listers' },
  { id: 'partiful', label: 'Partiful' },
  { id: 'nycparks', label: 'NYC Parks' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'manual', label: 'Added manually' },
];

export const sourceById = (id: SourceSite): SourceMeta =>
  SOURCES.find((s) => s.id === id) ?? SOURCES[SOURCES.length - 1];
