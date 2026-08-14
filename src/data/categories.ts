import type { Category, CategoryId } from '../types';

export const CATEGORIES: Category[] = [
  {
    id: 'healthy',
    name: 'Stay Healthy',
    outcome: 'Feel physically active and capable',
    color: '#7C8A6B', // sage — matches the "positive/checked" sage already used across the design system
  },
  {
    id: 'creative',
    name: 'Stay Creative',
    outcome: 'Make or express rather than only consume',
    color: '#C97B63', // terracotta
  },
  {
    id: 'peaceful',
    name: 'Stay Peaceful',
    outcome: 'Reduce stimulation and feel restored',
    color: '#6D829C', // dusty blue
  },
  {
    id: 'grow',
    name: 'Grow',
    outcome: 'Learn, think, and develop mastery',
    color: '#B99A63', // gold — reuses the shared accent, fits "growth" thematically
  },
  {
    id: 'connect',
    name: 'Connect',
    outcome: 'Form or deepen real-world relationships',
    color: '#B06A8F', // dusty rose
  },
];

export const categoryById = (id: CategoryId): Category =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
