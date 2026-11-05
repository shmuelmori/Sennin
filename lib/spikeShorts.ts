// Hard-coded Shorts for the player spike (status.md steps 1.1 and 1.2).
// Step 7.1 replaces this list with feed_item rows from the database.
//
// Checked with videos.list on 2026-11-05: all embeddable, vertical (720x1280)
// and 3 minutes or less. Channels alternate so neighbors differ.

export type SpikeShort = {
  videoId: string;
  channelTitle: string;
  title: string;
};

export const SPIKE_SHORTS: readonly SpikeShort[] = [
  { videoId: 'V_uq3v6xK-4', channelTitle: '3Blue1Brown', title: 'The Sphere Intersection Puzzle' },
  { videoId: 'N1ZFVBls--g', channelTitle: 'Epic History', title: 'How 9/11 Changed Islam Forever' },
  { videoId: 'aMr06C8Tx1I', channelTitle: 'Gotham Games', title: 'second best chess player' },
  { videoId: 'ausLKMojXaY', channelTitle: '3Blue1Brown', title: 'The Phone Number puzzle' },
  {
    videoId: '8evi9oV8flE',
    channelTitle: 'Epic History',
    title: 'The Speech that ENDED the Mutiny: Alexander Shames His Army',
  },
  { videoId: 'rYyJm1tD3d0', channelTitle: '3Blue1Brown', title: 'The jumping pegs puzzle' },
  {
    videoId: 'FApFm5TMIks',
    channelTitle: 'Epic History',
    title: 'The Carpenter Who Almost Killed Hitler: Georg Elser',
  },
  { videoId: '6XPlmCDNLNc', channelTitle: '3Blue1Brown', title: 'The 64 sugar cubes puzzle' },
  {
    videoId: 'ajAcM45XzKc',
    channelTitle: 'Epic History',
    title: "Stalin's Brutal Invasion of Finland: The Unexpected Military Disaster",
  },
  {
    videoId: 'QLu_ZsRc_G0',
    channelTitle: '3Blue1Brown',
    title: 'Covering 10 points, a surprisingly tricky puzzle.',
  },
  {
    videoId: 'j_HwAskiTuU',
    channelTitle: 'Epic History',
    title: 'The Sannikov Expedition: Hunting for a Mythical Arctic Island?',
  },
  { videoId: 'Y7ImxZ_YhJk', channelTitle: '3Blue1Brown', title: "Escher's most mind-bending piece" },
  {
    videoId: 'OIJIMGZw3zs',
    channelTitle: 'Epic History',
    title: 'Lexington: the Shot That Started the American Revolution',
  },
  { videoId: '4h5BEALuh44', channelTitle: '3Blue1Brown', title: 'The subset sum puzzle' },
  {
    videoId: '4iKkw1ftl2M',
    channelTitle: 'Epic History',
    title: 'The WHITE vs RED Terror during the Russian Civil War',
  },
];
