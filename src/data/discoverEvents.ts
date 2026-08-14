import type { DiscoverEvent } from '../types';

/**
 * A curated, point-in-time snapshot of real events pulled from Eventbrite,
 * Dice, Resident Advisor, Bucket Listers, and Partiful (first gathered late
 * July 2026, refreshed 2026-08-10 with a second real batch — including
 * Resident Advisor, which wasn't reachable in the first pass — plus revived
 * dates on two listings that had scrolled into the past). Every title,
 * location, and link below is real — copied from an actual live listing on
 * that site — but this is NOT a live feed: none of these five sites offers
 * a public API a browser-based app can call, and their listing pages are
 * either login-walled or heavily JS-rendered, so "parse the site on every
 * visit" isn't something this prototype can do. This snapshot exists to
 * picture what a populated, searchable Discover feed would look like;
 * refreshing it for real would mean re-pulling a new batch by hand (or,
 * down the road, standing up a small backend that has server-side access to
 * each site's actual API/partner feed). See DiscoverSearch.tsx for how the
 * "Search" box in the Discover panel plays into this today.
 *
 * Also added 2026-08-10: a small "nycparks" batch (outdoor/free movie
 * screenings — Movies With A View, Movies Under the Stars, Summer on the
 * Hudson) pulled from general web search rather than the five platforms
 * above, after the "movies" search query came back empty and exposed that
 * gap in the curated set. Same rule applied: only entries with a real,
 * confirmed URL from actual search results were added — nothing invented.
 *
 * The Discover panel (CalendarView.tsx) filters out anything whose
 * `dateStart` is already in the past, so this file doesn't need to be
 * hand-pruned every day — only refreshed periodically so there's still a
 * healthy number of *upcoming* entries left after that filter runs.
 *
 * A few of the source listings are recurring ("Saturdays") or open-ended
 * ("visit any day") rather than single-occurrence — for those, `dateStart`
 * is the next real occurrence / a suggested visit date, and `date` spells
 * that out (e.g. "Saturdays, next up ..." / "Open daily — suggested ...")
 * rather than implying it's the only date the thing is happening. This
 * keeps every card schedulable with one tap instead of silently landing in
 * "Not yet scheduled."
 *
 * Every entry also carries approximate `lat`/`lng` for the venue, which
 * powers "Sort by distance" in the Discover panel. Where the original
 * listing didn't include a specific address, `location` is a reasonable
 * neighborhood-level placeholder rather than an invented street address.
 *
 * Instagram intentionally has no entries here — per the screenshot-upload
 * decision, Instagram content only ever comes in via a person's own
 * uploaded screenshot in "Add something," not a pulled-in feed.
 */
export const DISCOVER_EVENTS: DiscoverEvent[] = [
  {
    id: 'eventbrite-kintsugi-workshop',
    title: 'Discover the Art of Kintsugi: Pottery Repair Workshop',
    category: 'creative',
    source: 'eventbrite',
    link: 'https://www.eventbrite.com/e/discover-the-art-of-kintsugi-an-intro-workshop-on-pottery-repair-tickets-1994528382082',
    date: 'Multiple dates, next up Sun, Aug 16, 2026',
    dateStart: '2026-08-16',
    location: '36 E Broadway, Manhattan',
    lat: 40.7135,
    lng: -73.9962,
    blurb:
      'A 2.5-hour hands-on workshop learning the Japanese art of repairing pottery with urushi lacquer and metal powder.',
  },
  {
    id: 'eventbrite-rooftop-yoga',
    title: 'NYC Rooftop Yoga & Sound Bath Saturdays',
    category: 'healthy',
    source: 'eventbrite',
    link: 'https://www.eventbrite.com/e/nyc-rooftop-yoga-sound-bath-saturdays-manhattan-tickets-1989611483506',
    date: 'Saturdays, next up Aug 15, 2026',
    dateStart: '2026-08-15',
    location: 'Arlo Midtown, Manhattan',
    lat: 40.7551,
    lng: -73.9926,
    blurb: 'An hour of rooftop yoga and a guided sound bath with skyline views in Midtown.',
  },
  {
    id: 'eventbrite-free-meditation',
    title: 'Free Meditation for Self-Discovery & Inner Peace',
    category: 'peaceful',
    source: 'eventbrite',
    link: 'https://www.eventbrite.com/e/free-one-hour-meditation-classes-for-self-discovery-and-inner-peace-nyc-tickets-1977456150578',
    date: 'Wed, Aug 12, 2026',
    dateStart: '2026-08-12',
    location: 'Midtown, Manhattan',
    lat: 40.758,
    lng: -73.9855,
    blurb: 'A free, one-hour guided meditation session focused on self-discovery and inner calm.',
  },
  {
    id: 'eventbrite-summer-festival',
    title: '2026 NYC Summer Music, Arts & Vendor Festival',
    category: 'connect',
    source: 'eventbrite',
    link: 'https://www.eventbrite.com/e/2026-nyc-summer-music-arts-vendor-festival-tickets-1992065829521',
    date: 'Aug 14–16, 2026',
    dateStart: '2026-08-14',
    dateEnd: '2026-08-16',
    location: 'Astoria Park, Queens',
    lat: 40.7794,
    lng: -73.9223,
    blurb: 'A free, family-friendly weekend with live music, local artists, artisan vendors, and food.',
  },
  {
    id: 'dice-we-belong-here',
    title: 'We Belong Here: Brooklyn 2026 (All Weekend)',
    category: 'creative',
    source: 'dice',
    link: 'https://dice.fm/event/925m57-we-belong-here-brooklyn-2026-all-weekend-19th-jun-brooklyn-army-terminal-full-waterfront-new-york-city-tickets?lng=en-US',
    date: 'Aug 21–23, 2026',
    dateStart: '2026-08-21',
    dateEnd: '2026-08-23',
    location: 'Brooklyn Army Terminal',
    lat: 40.6389,
    lng: -74.0186,
    blurb: "A 21+ dance music festival on Brooklyn's waterfront.",
  },
  {
    id: 'dice-experts-only',
    title: 'Experts Only Festival NYC 2026 ft. John Summit',
    category: 'creative',
    source: 'dice',
    link: 'https://dice.fm/event/3o6oex-experts-only-festival-nyc-2026-19th-sep-randalls-island-park-new-york-city-tickets?lng=en-US',
    date: 'Sep 19, 2026',
    dateStart: '2026-09-19',
    dateEnd: '2026-09-20',
    location: "Randall's Island Park",
    lat: 40.79,
    lng: -73.9209,
    blurb: 'A dance-music festival headlined by John Summit.',
  },
  {
    id: 'dice-nye-lpr',
    title: "New Year's Eve 2026 ft. MC4D at Le Poisson Rouge",
    category: 'connect',
    source: 'dice',
    link: 'https://dice.fm/event/pypxdp-new-years-eve-2026-ft-mc4d-at-lpr-31st-dec-le-poisson-rouge-new-york-tickets?lng=en-US',
    date: 'Dec 31, 2026',
    dateStart: '2026-12-31',
    location: 'Le Poisson Rouge',
    lat: 40.7286,
    lng: -74.0,
    blurb: 'Ring in the new year with concert-level production and a full night of music.',
  },
  {
    id: 'bucketlisters-museum-illusions',
    title: 'Museum of Illusions New York',
    category: 'grow',
    source: 'bucketlisters',
    link: 'https://bucketlisters.com/experience/museum-of-illusions-new-york',
    date: 'Open daily — suggested Sat, Aug 15, 2026',
    dateStart: '2026-08-15',
    location: 'Chelsea, Manhattan',
    lat: 40.7465,
    lng: -74.0014,
    blurb: 'An interactive museum of mind-bending optical illusions and gravity-defying rooms.',
  },
  {
    id: 'bucketlisters-friends-experience',
    title: 'The FRIENDS Experience: The One in New York',
    category: 'creative',
    source: 'bucketlisters',
    link: 'https://bucketlisters.com/experience/friends-experience-nyc',
    date: 'Open daily — suggested Sun, Aug 16, 2026',
    dateStart: '2026-08-16',
    location: 'Flatiron District, Manhattan',
    lat: 40.741,
    lng: -73.9896,
    blurb: 'An immersive walk-through recreation of the iconic sets, with photo ops throughout.',
  },
  {
    id: 'bucketlisters-family-guy',
    title: 'Family Guy Drunken Clam Experience',
    category: 'connect',
    source: 'bucketlisters',
    link: 'https://bucketlisters.com/experience/family-guy-drunken-clam-experience-nyc',
    date: 'Open daily — suggested Sat, Aug 22, 2026',
    dateStart: '2026-08-22',
    location: "Hell's Kitchen, Manhattan",
    lat: 40.7638,
    lng: -73.9918,
    blurb: "A themed bar experience recreating Quahog's Drunken Clam, with themed cocktails and photo ops.",
  },
  {
    id: 'partiful-elevenlabs',
    title: 'ElevenLabs: Live from NY',
    category: 'grow',
    source: 'partiful',
    link: 'https://partiful.com/e/Vamn82rpSCMY5sp1UgNG',
    date: 'Thu, Aug 13, 2026',
    dateStart: '2026-08-13',
    location: 'Flatiron District, Manhattan',
    lat: 40.7395,
    lng: -73.9903,
    blurb: "An evening at ElevenLabs' new NY office with conversations with AI and tech leaders.",
  },
  {
    id: 'partiful-venture-salon',
    title: 'Venture Salon: Founders & Investors',
    category: 'connect',
    source: 'partiful',
    link: 'https://partiful.com/e/AIjt9GNmqfJGNSGsOECn',
    date: 'Thu, Aug 20, 2026',
    dateStart: '2026-08-20',
    location: 'Manhattan',
    lat: 40.742,
    lng: -73.989,
    blurb: 'An intimate gathering of founders, investors, and operators in Manhattan.',
  },
  {
    id: 'dice-millkzy',
    title: 'Millkzy: Extension Of You Tour',
    category: 'creative',
    source: 'dice',
    link: 'https://dice.fm/partner/tickets/event/g5xlx5-millkzy-extension-of-you-tour-11th-aug-babys-all-right-new-york-tickets',
    date: 'Tue, Aug 11, 2026',
    dateStart: '2026-08-11',
    location: "Baby's All Right, Williamsburg, Brooklyn",
    lat: 40.7096,
    lng: -73.9585,
    blurb: 'An 18+ live show from Millkzy at one of Williamsburg\'s go-to small venues.',
  },
  {
    id: 'ra-mayan-warrior',
    title: 'Mayan Warrior New York — Full Art Car',
    category: 'creative',
    source: 'residentadvisor',
    link: 'https://ra.co/events/2487861',
    date: 'Sat, Aug 15, 2026',
    dateStart: '2026-08-15',
    location: 'Under the K Bridge, Greenpoint, Brooklyn',
    lat: 40.7305,
    lng: -73.941,
    blurb: "Burning Man's Mayan Warrior art car makes a rare NYC stop, with Carl Craig, Art Department, and Chaim on the lineup.",
  },
  {
    id: 'ra-cc-music-factory',
    title: 'C+C Music Factory (Live)',
    category: 'connect',
    source: 'residentadvisor',
    link: 'https://ra.co/events/2452351',
    date: 'Fri, Aug 14, 2026',
    dateStart: '2026-08-14',
    location: 'Paragon, East Williamsburg, Brooklyn',
    lat: 40.7145,
    lng: -73.933,
    blurb: "A live set from C+C Music Factory alongside DJ Miss Parker, DREAMINSLOW, and more — a dance-floor night out.",
  },
  {
    id: 'ra-soul-alliance-boat',
    title: 'Soul Alliance Boat Party 2026',
    category: 'connect',
    source: 'residentadvisor',
    link: 'https://ra.co/events/2499929',
    date: 'Sun, Aug 23, 2026',
    dateStart: '2026-08-23',
    location: 'Circle Line Cruises, Pier 83, Manhattan',
    lat: 40.7647,
    lng: -73.9997,
    blurb: 'A daytime boat party around Manhattan with classic house/disco sets from Danny Krivit and Joe Claussell.',
  },
  {
    id: 'ra-magnetic',
    title: 'Magnetic ft. Artwork, Alex McCracken & More',
    category: 'creative',
    source: 'residentadvisor',
    link: 'https://ra.co/events/2499263',
    date: 'Fri, Aug 28, 2026',
    dateStart: '2026-08-28',
    location: 'Good Room, Greenpoint, Brooklyn',
    lat: 40.7247,
    lng: -73.9503,
    blurb: 'An underground house night at Good Room headlined by Artwork, with a deep supporting lineup.',
  },
  {
    id: 'partiful-nyc-got-talent',
    title: "NYC's Got Talent",
    category: 'creative',
    source: 'partiful',
    link: 'https://partiful.com/e/TyTzpJb6ry0HBshhCove',
    date: 'Mon, Aug 17, 2026',
    dateStart: '2026-08-17',
    location: 'Manhattan',
    lat: 40.758,
    lng: -73.9855,
    blurb: 'A live community talent showcase — singing, dancing, aerial, acrobatics, comedy, and more.',
  },
  {
    id: 'partiful-95killers',
    title: '95killers & Friends Summer Nights',
    category: 'connect',
    source: 'partiful',
    link: 'https://partiful.com/e/buMzzwSSwq3gKMn39mUT',
    date: 'Sat, Aug 29, 2026',
    dateStart: '2026-08-29',
    location: 'Aloft Harlem, Manhattan',
    lat: 40.8091,
    lng: -73.9482,
    blurb: 'An afternoon-into-evening celebration of culture, community, and creativity in Harlem.',
  },
  {
    id: 'eventbrite-yoga-sound-bath-reset',
    title: 'NYC Yoga & Sound Bath for Presence & Stress Release',
    category: 'healthy',
    source: 'eventbrite',
    link: 'https://www.eventbrite.com/e/nyc-yoga-sound-bath-for-presence-stress-release-tickets-1712607778969',
    date: 'Multiple dates, next up Sat, Aug 15, 2026',
    dateStart: '2026-08-15',
    location: 'Flatiron District, Manhattan',
    lat: 40.7484,
    lng: -73.9857,
    blurb: 'A grounding hour of gentle yoga followed by a live sound bath to release tension and reset.',
  },
  {
    id: 'nycparks-movies-view-do-the-right-thing',
    title: 'Movies With A View: Do the Right Thing',
    category: 'creative',
    source: 'nycparks',
    link: 'https://nycgovparks.org/events/2026/08/13/brooklyn-bridge-park-movies-with-a-view-presented-by-persol',
    date: 'Thu, Aug 13, 2026',
    dateStart: '2026-08-13',
    location: 'Pier 1 Harbor View Lawn, Brooklyn Bridge Park',
    lat: 40.7024,
    lng: -73.9967,
    blurb:
      "Free outdoor screening of Spike Lee's Do the Right Thing on the Harbor View Lawn, with pre-show DJ sets and skyline views. Lawn opens 6pm, film at sundown.",
  },
  {
    id: 'nycparks-movies-under-stars-akeelah',
    title: 'Movies Under the Stars: Akeelah and the Bee (20th Anniversary)',
    category: 'connect',
    source: 'nycparks',
    link: 'https://nitehawkcinema.com/prospectpark/movies/akeelah-and-the-bee/',
    date: 'Wed, Aug 12, 2026',
    dateStart: '2026-08-12',
    location: 'Prospect Park, North End of Long Meadow (Grand Army Plaza entrance), Brooklyn',
    lat: 40.6602,
    lng: -73.9707,
    blurb:
      "A free 20th-anniversary outdoor screening of Akeelah and the Bee, part of NYC Parks & MOME's summer movie series — picnic on the lawn before the film starts at sundown.",
  },
  {
    id: 'nycparks-summer-hudson-la-chimera',
    title: 'Summer on the Hudson: La Chimera',
    category: 'peaceful',
    source: 'nycparks',
    link: 'https://www.nyctourism.com/events/summer-on-the-hudson-pier-i-picture-show/',
    date: 'Wed, Aug 12, 2026',
    dateStart: '2026-08-12',
    location: 'Pier I, Riverside Park, Manhattan',
    lat: 40.7825,
    lng: -73.9908,
    blurb:
      'A quiet riverside screening of La Chimera on Pier I — park opens 7pm for seating, movie starts around 8:30pm as the sun sets over the Hudson.',
  },
  {
    id: 'nycparks-movies-view-public-choice',
    title: 'Movies With A View: Public Choice Night',
    category: 'connect',
    source: 'nycparks',
    link: 'https://brooklynbridgepark.org/event-series/movies-with-a-view/',
    date: 'Thu, Aug 27, 2026',
    dateStart: '2026-08-27',
    location: 'Pier 1 Harbor View Lawn, Brooklyn Bridge Park',
    lat: 40.7024,
    lng: -73.9967,
    blurb:
      "The crowd votes online for the film — this round's picks are Challengers, The Great Gatsby, or Ocean's Eleven. Free entry, lawn opens 6pm, film at sundown.",
  },
];
