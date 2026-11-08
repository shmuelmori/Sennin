// The icon kind of a topic on the Topics and Refresh tabs. Items have no
// category, so the kind comes from the words of the name: each word (and its
// singular, e.g. "volcanoes" -> "volcano") is looked up in the word lists
// below, checked in this order. The first kind with a matching word wins,
// e.g. "Ice cream" is food before "ice" can make it chemistry. A name with no
// known word is a plain 'topic'.

export type TopicKind =
  | 'food'
  | 'plant'
  | 'space'
  | 'people'
  | 'history'
  | 'tech'
  | 'transport'
  | 'building'
  | 'math'
  | 'mind'
  | 'language'
  | 'money'
  | 'sea'
  | 'bird'
  | 'insect'
  | 'animal'
  | 'biology'
  | 'body'
  | 'weather'
  | 'earth'
  | 'physics'
  | 'chemistry'
  | 'music'
  | 'arts'
  | 'world'
  | 'games'
  | 'topic';

const WORDS: readonly (readonly [TopicKind, string])[] = [
  ['food', 'coffee tea chocolate banana potato rice wheat corn tomato chili pepper garlic cooking baking bread fermentation cheese cream spice'],
  ['plant', 'tree redwood bamboo mushroom fungi moss cactus carnivorous plant flytrap sunflower rose photosynthesis seed pollination'],
  ['space', 'hole neutron supernova sun moon planet venus mars jupiter saturn uranus neptune pluto comet asteroid meteorite galaxy milky andromeda dark bang exoplanet eclipse aurora space astronaut apollo telescope rocket satellite rover star'],
  ['people', 'cleopatra alexander caesar leonardo newton einstein curie tesla darwin genghis napoleon'],
  ['history', 'ancient egypt pyramid mummy rome roman empire colosseum greece viking samurai ninja knight castle medieval death day silk wall aztec maya inca mongol titanic war revolution stonehenge pompeii atlantis age'],
  ['tech', 'claude ai model neural network machine learning transistor microchip computer internet wi gps smartphone touchscreen camera encryption password algorithm binary code programming python javascript git linux robot drone printing solar turbine power clock refrigerator microwave'],
  ['transport', 'car airplane helicopter submarine train jet engine'],
  ['building', 'bridge skyscraper elevator tunnel dam architecture'],
  ['math', 'pi prime number infinity zero fibonacci ratio fractal probability statistic geometry triangle circle topology mobius paradox logic puzzle game cryptography calculus algebra'],
  ['mind', 'psychology habit motivation procrastination optical illusion cognitive bias emotion happiness stress meditation body memory sleep dream philosophy stoicism'],
  ['language', 'language etymology writing alphabet'],
  ['money', 'economic inflation money stock market cryptocurrency'],
  ['sea', 'octopus squid cuttlefish jellyfish turtle shark whale orca dolphin ray seahorse coral reef anglerfish pufferfish starfish urchin shrimp crab lobster otter narwhal sea ocean trench tide tsunami'],
  ['bird', 'owl eagle hummingbird penguin parrot crow flamingo bird'],
  ['insect', 'honeybee bee ant termite butterfly dragonfly spider scorpion firefly mosquito insect'],
  ['animal', 'elephant giraffe cheetah lion tiger leopard wolf wolves fox bear panda koala kangaroo platypus sloth gorilla chimpanzee orangutan bat camel horse cat dog hedgehog beaver capybara chameleon dragon crocodile snake frog axolotl dinosaur rex mammoth tardigrade animal'],
  ['biology', 'bacteria virus vaccine antibiotic dna gene crispr stem cell cancer'],
  ['body', 'heart brain neuron eye ear skin bone muscle blood immune allergy hiccup yawning fingerprint taste adrenaline dopamine'],
  ['weather', 'cloud tornado hurricane snowflake hail fog wind climate lightning rainbow'],
  ['earth', 'volcano earthquake tectonic mountain glacier iceberg desert rainforest cave canyon river waterfall current fossil geyser quicksand sand dune amber'],
  ['physics', 'magnet battery gravity light sound electricity friction momentum energy heat temperature entropy relativity dilation quantum laser radioactivity nuclear fusion fission wave mirror lens pendulum lever buoyancy pressure vacuum'],
  ['chemistry', 'iron gold silver copper aluminum lithium sodium mercury uranium carbon oxygen hydrogen helium nitrogen periodic atom electron chemical acid salt water ice fire rust plastic glass diamond crystal'],
  ['music', 'music guitar piano drum'],
  ['arts', 'knot origami paper pencil soap color painting'],
  ['world', 'map flag zone calendar'],
  ['games', 'olympic football basketball chess rubik juggling magic trick'],
];

const KIND_BY_WORD: ReadonlyMap<string, TopicKind> = (() => {
  const map = new Map<string, TopicKind>();
  // Earlier kinds win, so a word listed twice keeps its first kind.
  for (const [kind, words] of WORDS) {
    for (const word of words.split(' ')) {
      if (!map.has(word)) map.set(word, kind);
    }
  }
  return map;
})();

const KIND_ORDER: readonly TopicKind[] = WORDS.map(([kind]) => kind);

/** A word and the singular forms it could have: "allergies" -> "allergy". */
function wordForms(word: string): string[] {
  const forms = [word];
  if (word.endsWith('ies')) forms.push(`${word.slice(0, -3)}y`);
  if (word.endsWith('es')) forms.push(word.slice(0, -2));
  if (word.endsWith('s')) forms.push(word.slice(0, -1));
  return forms;
}

/** The icon kind for a topic name. */
export function topicKind(name: string): TopicKind {
  const words = name.toLocaleLowerCase('en-US').split(/[^a-z0-9]+/).filter((word) => word !== '');
  const found = new Set<TopicKind>();
  for (const word of words) {
    for (const form of wordForms(word)) {
      const kind = KIND_BY_WORD.get(form);
      if (kind !== undefined) found.add(kind);
    }
  }
  return KIND_ORDER.find((kind) => found.has(kind)) ?? 'topic';
}
