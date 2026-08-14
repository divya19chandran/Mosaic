import { useState } from 'react';
import AppShell from './components/AppShell';
import ComingSoon from './components/ComingSoon';
import LandingPage from './pages/LandingPage';
import ExplorePage from './pages/ExplorePage';
import InsightsPage from './pages/InsightsPage';
import ProfilePage from './pages/ProfilePage';
import type { CategoryId } from './types';

function App() {
  const [tab, setTab] = useState('landing');
  const [exploreCategory, setExploreCategory] = useState<CategoryId | undefined>(undefined);
  const [exploreKey, setExploreKey] = useState(0);

  const enterExplore = (category?: CategoryId) => {
    setExploreCategory(category);
    setExploreKey((k) => k + 1); // force ExplorePage to remount with the fresh initial filter
    setTab('explore');
  };

  return (
    <AppShell active={tab} onNavigate={setTab}>
      {tab === 'landing' && <LandingPage onEnterExplore={enterExplore} onNavigate={setTab} />}
      {tab === 'explore' && <ExplorePage key={exploreKey} initialCategory={exploreCategory} />}
      {tab === 'insights' && <InsightsPage />}
      {tab === 'connect' && (
        <ComingSoon label="Connect" blurb="See who else is going, join circles, and share reflections with people on the same path." />
      )}
      {tab === 'profile' && <ProfilePage />}
    </AppShell>
  );
}

export default App;
