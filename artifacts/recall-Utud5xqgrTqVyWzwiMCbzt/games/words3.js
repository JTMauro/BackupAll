/* Recall batch 3: Guess the Word, Saying Scramble, Word Builder (words) and Times Tables, Number Line (numbers) */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor, store, CUBES } = R;
  const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  /* =========================================================
     SHARED WORD LISTS (copied from words2.js, not imported)
     ========================================================= */
  // Familiar everyday words, by length. Kept plain and kind: nothing rude, sad or violent.
  const DICT_SRC = [
    // 3 letters
    `ace act add age ago aid aim air ale all and ant any ape apt arc are ark arm art ash ask ate awe axe bad bag ban bar bat bay bed bee beg bet bib bid big bin bit boa bob bog bow box boy bud bug bun bus but buy bye cab can cap car cat cob cod cog cot cow coy cry cub cue cup cut dab dad dam day den dew did dig dim din dip doe dog don dot dry dub due dug dye ear eat ebb eel egg elf elk elm emu end era eve ewe eye fan far fat fed fee few fig fin fir fit fix flu fly foe fog for fox fry fun fur gap gas gel gem get gin got gum gut guy gym had ham has hat hay hem hen her hew hid him hip his hit hog hop hot how hub hue hug hum hut ice icy ill imp ink inn ion ire irk its ivy jab jam jar jaw jay jet jig job jog jot joy jug keg key kid kin kit lab lad lag lap law lay led leg let lid lie lip lit log lot low mad man map mat may men met mid mix mob mop mud mug mum nab nag nap net new nib nil nip nod nor not now nun nut oak oar oat odd off oil old one opt orb ore our out owe owl own pad pal pan pat paw pay pea peg pen pet pew pie pig pin pit ply pod pop pot pry pub pun pup put rag ram ran rap rat raw ray red rib rid rig rim rip rob rod roe rot row rub rug rum run rut rye sad sag sap sat saw say sea see set sew she shy sip sir sit six ski sky sly sob son sow soy spa spy sty sub sum sun sup tab tag tan tap tar tax tea tee ten the tie tin tip toe ton too top tot tow toy try tub tug two urn use van vat vet via vow wad wag was wax way web wed wee wet who why wig win wit woe wok won woo wow yak yam yap yes yet yew you zap zip zoo`,
    // 4 letters
    `able ache acid acre aged aide ajar also alto arch area army atom aunt away axle baby back bait bake bald bale ball band bang bank bare bark barn base bash bath bead beak beam bean bear beat beef been beer bell belt bend bent best bike bill bind bird bite blow blue blur boar boat body boil bold bolt bond bone book boom boot bore born boss both bowl brag brim brow bulb bulk bull bump bunk buoy burn bush busy buzz cafe cage cake calf call calm came camp cane cape card care cart case cash cast cave chat chef chin chip chop city clad clan clap claw clay clip club clue coal coat code coil coin cola cold colt comb come cone cook cool cope copy cord core cork corn cost cosy cozy crab crew crib crop crow cube curb cure curl cute daft damp dare dark darn dart dash date dawn deaf deal dear debt deck deed deep deer dent desk dial dice diet dime dine dirt dish dive dock doll dome done door dose dote dove down doze drab drag draw drew drip drop drum dual duck duel duke dull dump dune dusk dust duty each earl earn ease east easy echo edge edit epic even ever evil exit face fact fade fail fair fall fame fare farm fast fate fawn fear feed feel feet fell felt fern file fill film find fine fire firm fish fist fizz flag flap flat flea fled flee flew flip flow foal foam foil fold folk fond food fool foot fork form fort foul four fowl free fret frog from fuel full fury fuss gain gale game gasp gate gave gaze gear germ gift girl give glad glee glow glue glum gnat gnaw goal goat goes gold golf gone good gown grab grim grin grip grow grub gull gust hail hair half hall halo halt hand hang hard hare harm harp hate have hawk haze hazy head heal heap hear heat heel heir held helm help herb herd here hero hide high hike hill hilt hint hire hive hoax hold hole holy home hood hoof hook hoop hope horn hose host hour howl huge hump hunt hurt hush husk hymn icon idea idle inch into iron isle item jade jazz jeep jest join joke jolt jump june july just kale keen keep kelp kept kerb kick kind king kiss kite knee knew knit knot know lace lack lady laid lake lamb lamp land lane lark lash lass last late lawn lazy lead leaf leak lean leap left lend lens less liar lick life lift like lily limb lime limp line link lion list live load loaf loan lobe lock loft long look loop lord lose loss lost loud love luck lump lung lure lush made maid mail main make male malt mane many mare mark mash mask mast mate math maze meal mean meat meek meet melt mend menu mesh mess mice mild mile milk mill mind mine mint miss mist moan moat mock mode mole mood moon moor mope more moss most moth move much muff mule must nail name navy near neat neck need nest news next nice nine nook noon nose note numb oath obey okay once only ooze opal open oval oven over pace pack page paid pail pain pair pale palm pane pant park part pass past path pave pawn peak peal pear peas peat peck peel peep pelt perk pest pier pile pill pine pink pint pipe pity plan play plea plod plot plug plum plus poem poet poke pole poll polo pond pony pool poor pork port pose posh post pour pram pray prey prop puck puff pull puma pump punt pure purr push quit quiz race rack raft rage raid rail rain rake ramp rang rank rare rash rate rave read real reap rear reed reef reel rein rely rent rest rice rich ride ring rink ripe rise risk road roam roar robe rock rode role roll romp roof room root rope rose rosy ruby rude ruin rule rung rush rust sack safe sage said sail sake sale salt same sand sang sank sash save scan scar seal seam sear seat seed seek seem seen self sell send sent sewn shed shin ship shoe shoo shop shot show shut side sigh sign silk sill sing sink size skin skip slab slam slap slat sled slid slim slip slot slow slug slur smog smug snag snap snip snow snug soak soap soar sock sofa soft soil sold sole solo some song soon soot sore sort soul soup sour span sped spin spit spot spur stab stag star stay stem step stew stir stop stub stun such suit sulk sung sunk sure surf swan swap sway swim tack tail take tale talk tall tame tank tape tart task taxi team tear teen tell tend tent term test text than that thaw them then they thin this tick tide tidy tied tier tile till time tint tiny tire toad tofu told toll tone tong took tool toot tour town tram trap tray tree trek trim trio trip trot true tuba tube tuck tuna tune turn tusk twig twin type ugly undo unit upon used user vale vane vase vast veal veil vein verb very vest veto view vine vole vote wade wage wail wait wake walk wall wand wane want ward warm warn warp wart wash wasp wave wavy weak wear weed week weep well went were west what whey when whip wick wide wife wild will wilt wind wine wing wink wipe wire wiry wise wish with woke wolf wood wool word wore work worm worn wove wrap yard yarn yawn year yell yelp yoga yolk your zeal zero zinc zone zoom`,
    // 5 letters
    `about above acorn actor adult after again agree ahead alarm album alert alike alive allow alone along aloud alter amber among angel anger angle angry ankle apple apron arena argue arise aroma arrow aside awake award aware bacon badge bagel baker basic basin batch beach beard beast began begin being belly below bench berry birth black blade blame bland blank blaze blend bless blind blink block blond bloom blown blush board boast bonus boost booth bound braid brain brake brand brass brave bread break brick bride brief bring brisk broad brook broom broth brown brush buddy build built bunch bunny burst cabin cable camel canal candy canoe cargo carol carry carve catch cause cedar chain chair chalk charm chart chase cheap check cheek cheer chess chest chick chief child chill chime china chirp choir chord chore cider claim clamp clasp class clean clear clerk click cliff climb cling cloak clock close cloth cloud clown coach coast cocoa comet comic coral couch cough could count court cover craft crane crash crate crawl crazy cream creek crest crisp cross crowd crown crumb crush crust curly curve cycle daily dairy daisy dance depth diary dirty ditch dizzy dodge doing dough dozen draft drain drama drank drawn dream dress dried drift drill drink drive drove dryer eager eagle early earth eight elbow elder empty enjoy enter equal error event every exact extra fable faint fairy faith false fancy feast fence ferry fetch fever field fifth fifty final first flake flame flash flask float flock flood floor flour flute focus foggy force forty found frame fresh fried front frost froze fruit fudge funny fuzzy ghost giant glass globe glory glove going goose grace grade grain grand grant grape grasp grass gravy great green greet grill grind group grown guard guess guest guide habit happy harsh hatch heard heart heavy hedge hello hippo hobby honey horse hotel hound house human hurry ideal igloo image index inner ivory jeans jelly jewel joint jolly judge juice juicy kayak knead kneel knelt knife knock known koala label ladle large later laugh layer learn leash least leave ledge lemon level light lilac limit linen liver llama local lodge lofty logic loose lorry lucky lunch magic major maker mango manor maple march marsh match maybe mayor medal melon mercy merry metal might minor minus mixed model moist money month moose moral motor mount mouse mouth movie muddy music nanny nerve never night ninth noble noise noisy north novel nurse ocean offer often olive onion opera orbit order other otter ought ounce outer owner paint panda panel paper party pasta paste patch pause peace peach pearl pedal penny perch petal phone photo piano piece pilot pinch pizza place plain plane plant plate plaza plump point polar porch pouch pound power press price pride prime print prize proof proud prove pupil puppy purse quack queen quest quick quiet quilt quite radio rainy raise rally ranch range rapid raven reach ready relax reply rhyme rider ridge right rinse river roast robin robot rocky rough round route royal rugby ruler rural sadly saint salad salty sandy sauce scale scarf scene scent scone scoop score scout scrap seven shade shake shall shape share shark sharp shave shawl sheep sheet shelf shell shine shiny shirt shock shore short shout shown sight silly since skate skill skirt slate sleep slice slide slope small smart smell smile smoke snack snail snake sneak snore solid solve sorry sound south space spade spare spark speak spell spend spice spicy spill spine spoke spoon sport spray stack staff stage stair stamp stand stare start state steak steam steel steep steer stick stiff still sting stock stone stood stool store stork storm story stove straw strip stuck study stuff stump sugar sunny super sweat sweep sweet swept swift swing sword table taste teach teeth thank their theme there these thick thing think third thorn those three threw throw thumb tiger tight timer tired title toast today tooth topic torch total touch tough towel tower trace track trade trail train treat trend trial tribe trick tried truck truly trunk trust truth tulip tummy twice twist uncle under until upper upset usual value video visit vital vivid voice wagon waist watch water weary weave wedge whale wheat wheel where which while white whole whose width witch woman women world worry worse worst worth would wrist write wrong wrote yacht yield young youth zebra`,
    // 6 letters
    `action advice afraid almost always amount anchor animal answer anyone appear arrive artist asleep autumn badger bakery ballet banana barrel basket batter beauty become beetle before behind belong beside better beyond bishop border borrow bottle bottom bought branch breath breeze bridge bright broken bubble bucket budget bundle burrow butter button cactus camera candle cannot carpet carrot castle cattle cellar cereal chance change chapel cheese cherry choose chosen church circle circus clever closet clover coffee colour column comedy common cookie copper corner cotton cousin cradle credit cruise cuddle custom dancer danger decide degree desert design detail dinner direct doctor dollar donkey double dragon drawer driver during easily eating effect effort eighty either eleven empire energy engine enough entire escape expect fabric family famous farmer father fellow fiddle finger finish flight flower follow forest forget fossil freeze fridge friend frozen gallon garage garden garlic gentle ginger global golden ground growth guitar hammer handle happen harbor health heaven helmet helper hidden hockey hollow honest hungry hunter insect inside invent island jacket jigsaw jockey jumble jungle kettle kitten ladder leader league lesson letter liquid listen little lively locket lonely lovely magnet manner marble market meadow memory middle minute mirror mitten modern moment monkey mother muffin muscle museum nature nearby nearly needle nephew nobody noodle normal notice number object office orange oyster paddle palace parade parcel parent parrot peanut pebble pencil people pepper pickle picnic pigeon pillow pirate planet plenty pocket poetry police polite potato powder pretty prince pudding puddle puppet purple puzzle rabbit racket rather reader reason recipe record remain remind repair report rescue return ribbon riddle rocket rubber saddle safety sailor salmon sample school screen season second secret shadow shovel shower silent silver simple singer sister sleeve slowly smooth sneeze soccer spider spirit spring square stable statue steady sticky stream street string stripe strong summer sunset supper supply switch symbol tablet talent teapot temple tennis thirty thread throat ticket timber tomato tongue travel trophy turkey turnip turtle twelve twenty unless valley velvet violin voyage waiter walnut walrus warmth wealth weekly weight widely window winner winter wisdom within wizard wonder wooden writer yellow`
  ];
  const BAD = new Set(('ASS ARSE BUM POO POOP FART TIT PISS SHIT CRAP FUCK FUK FCK CUNT COCK DICK KNOB NOB PRAT TWAT WANK SEX BOOB SLUT HOE FAG NAZI KKK ' +
    'DIE DIED KILL DEAD PUKE SPUNK JIZZ PORN NUDE BITCH PENIS GAY HOMO RAPE NIG PAKI SPAZ TURD PUS POX SUCK DAMN HELL GUN WAR TOMB GRAVE').split(' '));

  // Picture words: [word, emoji, short clue]. Used here by Guess the Word.
  const PICS = [
    ['CAT', '🐱', 'Pet that purrs'], ['DOG', '🐶', 'Pet that barks'], ['COW', '🐮', 'Gives us milk'], ['PIG', '🐷', 'Pink farm animal'],
    ['HEN', '🐔', 'Lays eggs'], ['OWL', '🦉', 'Hoots at night'], ['BEE', '🐝', 'Makes honey'], ['ANT', '🐜', 'Tiny busy insect'],
    ['FOX', '🦊', 'Sly red animal'], ['BAT', '🦇', 'Flies at night'], ['EGG', '🥚', 'Boil it for breakfast'], ['PIE', '🥧', 'Baked with a crust'],
    ['TEA', '🍵', 'A nice hot cuppa'], ['CUP', '☕', 'Drink from it'], ['SUN', '☀️', 'Shines in the sky'], ['SEA', '🌊', 'Salty water'],
    ['KEY', '🔑', 'Opens a lock'], ['CAR', '🚗', 'Drive it on the road'], ['BUS', '🚌', 'Wait at the stop for it'], ['VAN', '🚐', 'Small delivery vehicle'],
    ['HAT', '🎩', 'Wear it on your head'], ['MAP', '🗺️', 'Shows the way'], ['PEN', '🖊️', 'Write with it'], ['BOX', '📦', 'Put things in it'],
    ['BED', '🛏️', 'Sleep in it'], ['EYE', '👁️', 'You see with it'], ['EAR', '👂', 'You hear with it'], ['LEG', '🦵', 'You walk on it'],
    ['ARM', '💪', 'Shoulder to hand'], ['WEB', '🕸️', 'A spider spins it'], ['NUT', '🥜', 'A squirrel’s snack'], ['ICE', '🧊', 'Frozen water'],
    ['BOW', '🎀', 'Tie a ribbon in one'], ['NET', '🥅', 'Catches the ball'], ['TOY', '🧸', 'A child plays with it'], ['BAG', '👜', 'Carry things in it'],
    ['AXE', '🪓', 'Chops wood'], ['INK', '🖋️', 'Fills a fountain pen'], ['PAN', '🍳', 'Fry eggs in it'], ['RAT', '🐀', 'Long-tailed rodent'],
    ['APE', '🦍', 'Big hairy animal'], ['JAM', '🍓', 'Spread it on toast'], ['HAM', '🍖', 'Meat for sandwiches'], ['YAM', '🍠', 'Sweet potato'],
    ['TEN', '🔟', 'Number after nine'], ['RAM', '🐏', 'Male sheep'], ['ELF', '🧝', 'Santa’s helper'], ['OAK', '🌳', 'Tree from an acorn'],
    ['TIE', '👔', 'Worn with a shirt'], ['JET', '✈️', 'Very fast plane'], ['SKI', '⛷️', 'Slide down snow'], ['GEM', '💎', 'Precious stone'],
    ['ROD', '🎣', 'Used for fishing'], ['COD', '🐟', 'Fish with chips'], ['ROW', '🚣', 'Use oars to do this'], ['DEW', '💧', 'Morning wet on grass'],
    ['TUB', '🛁', 'A bath'], ['CUB', '🐻', 'Baby bear'], ['KID', '🐐', 'Young goat'], ['TOE', '🦶', 'You have ten of these'],
    ['GYM', '🏋️', 'Place to exercise'], ['SPY', '🕵️', 'Secret agent'], ['ZOO', '🦒', 'Animals live here'], ['FIN', '🦈', 'On a shark’s back'],
    ['BOY', '👦', 'Young lad'], ['MAN', '👨', 'Grown-up chap'], ['DAY', '🌞', 'Opposite of night'], ['SAD', '😢', 'Feeling blue'],
    ['HOT', '🔥', 'Like fire'], ['RED', '🔴', 'Colour of a tomato'], ['WET', '💦', 'Rained on'], ['SIX', '🎲', 'Top score on a die'],
    ['FLY', '🪰', 'Buzzing insect'], ['MUD', '🐖', 'Pigs roll in it'], ['PEA', '🟢', 'Small round green veg'],
    ['FISH', '🐟', 'Swims in water'], ['BIRD', '🐦', 'Has wings and feathers'], ['DUCK', '🦆', 'Says quack'], ['FROG', '🐸', 'Green pond jumper'],
    ['BEAR', '🐻', 'Big furry animal'], ['LION', '🦁', 'King of the jungle'], ['GOAT', '🐐', 'Farm animal with horns'], ['LAMB', '🐑', 'Baby sheep'],
    ['CRAB', '🦀', 'Walks sideways'], ['DEER', '🦌', 'Has antlers'], ['SWAN', '🦢', 'Graceful white bird'], ['WOLF', '🐺', 'Howls at the moon'],
    ['DOVE', '🕊️', 'Bird of peace'], ['PONY', '🐴', 'Small horse'], ['CAKE', '🍰', 'Birthday treat'], ['MILK', '🥛', 'White drink'],
    ['CORN', '🌽', 'Yellow on the cob'], ['PEAR', '🍐', 'Fruit, wide at the bottom'], ['RICE', '🍚', 'Tiny white grains'], ['SOUP', '🍲', 'Eat it with a spoon'],
    ['MEAT', '🥩', 'The butcher sells it'], ['TREE', '🌳', 'Has a trunk and leaves'], ['ROSE', '🌹', 'Red flower with thorns'], ['LEAF', '🍃', 'Grows on a tree'],
    ['MOON', '🌙', 'Shines at night'], ['STAR', '⭐', 'Twinkles in the sky'], ['RAIN', '🌧️', 'Falls from clouds'], ['SNOW', '❄️', 'Cold white flakes'],
    ['FIRE', '🔥', 'Hot and bright'], ['BOAT', '⛵', 'Sails on water'], ['SHIP', '🚢', 'Very big boat'], ['KITE', '🪁', 'Fly it on a windy day'],
    ['BELL', '🔔', 'Rings ding dong'], ['BOOK', '📖', 'Read it'], ['DRUM', '🥁', 'Bang it with sticks'], ['SOCK', '🧦', 'Worn on your foot'],
    ['COAT', '🧥', 'Keeps you warm outside'], ['SHOE', '👞', 'Has laces'], ['RING', '💍', 'Worn on a finger'], ['DOOR', '🚪', 'Open and shut it'],
    ['SOAP', '🧼', 'Wash your hands with it'], ['HAND', '✋', 'Has five fingers'], ['FOOT', '🦶', 'End of your leg'], ['NOSE', '👃', 'You smell with it'],
    ['BONE', '🦴', 'A dog chews it'], ['TENT', '⛺', 'Sleep in it camping'], ['GIFT', '🎁', 'A present'], ['GOLF', '⛳', 'Sport with holes'],
    ['BALL', '⚽', 'Kick it'], ['BIKE', '🚲', 'Two wheels and pedals'], ['TAXI', '🚕', 'Hail it in the street'], ['KING', '🤴', 'Wears a crown'],
    ['BATH', '🛁', 'Wash in it'], ['SEED', '🌱', 'Plant it to grow'], ['WAVE', '👋', 'Say hello with a hand'], ['FORK', '🍴', 'Eat with it'],
    ['VASE', '🏺', 'Holds flowers'], ['HORN', '📯', 'Toot it'], ['FLAG', '🚩', 'Flies on a pole'], ['LOCK', '🔒', 'A key opens it'],
    ['MASK', '🎭', 'Covers the face'], ['PALM', '🌴', 'Tropical tree'], ['KIWI', '🥝', 'Green fuzzy fruit'], ['MAIL', '📬', 'The postman brings it'],
    ['BOOT', '👢', 'Tall shoe'], ['WOOL', '🧶', 'Knit with it'], ['FARM', '🐄', 'Old MacDonald had one'], ['SAND', '🏖️', 'On the beach'],
    ['WIND', '💨', 'Blows the kite'], ['LAMP', '💡', 'Gives light'], ['CHIP', '🍟', 'Fried potato'], ['HILL', '⛰️', 'Small mountain'],
    ['BABY', '👶', 'Very young child'], ['GIRL', '👧', 'Young lass'], ['HOME', '🏡', 'Where the heart is'], ['CARD', '🃏', 'Playing ___'],
    ['GOLD', '🥇', 'First-place medal'], ['DICE', '🎲', 'Roll them'], ['TRAM', '🚋', 'Runs on rails in town'], ['SOFA', '🛋️', 'Comfy seat'],
    ['CLAP', '👏', 'Hands together'], ['KISS', '💋', 'A smooch'], ['SING', '🎤', 'Use your voice'], ['WINE', '🍷', 'Red or white drink'],
    ['BEER', '🍺', 'A pint at the pub'], ['FERN', '🌿', 'Leafy green plant'], ['NOTE', '🎵', 'Musical sign'], ['SONG', '🎶', 'Something to sing'],
    ['FILM', '🎬', 'Watch it at the pictures'], ['CLUB', '♣️', 'Card suit'], ['HERO', '🦸', 'Saves the day'], ['POOL', '🏊', 'Swim in it'],
    ['SURF', '🏄', 'Ride a wave'], ['LOVE', '❤️', 'All you need'], ['CORK', '🍾', 'In a wine bottle'], ['MOTH', '🦋', 'Night-time butterfly'],
    ['HORSE', '🐎', 'Gallops in a field'], ['SHEEP', '🐑', 'Gives us wool'], ['MOUSE', '🐭', 'Squeaks, likes cheese'], ['TIGER', '🐯', 'Big striped cat'],
    ['ZEBRA', '🦓', 'Striped horse'], ['CAMEL', '🐫', 'Has humps'], ['SNAKE', '🐍', 'Slithers along'], ['WHALE', '🐳', 'Biggest sea animal'],
    ['SHARK', '🦈', 'Fish with sharp teeth'], ['SNAIL', '🐌', 'Carries its shell'], ['EAGLE', '🦅', 'Big bird of prey'], ['PANDA', '🐼', 'Black and white bear'],
    ['OTTER', '🦦', 'Playful river animal'], ['LLAMA', '🦙', 'Woolly, from Peru'], ['BREAD', '🍞', 'Make toast with it'], ['APPLE', '🍎', 'Keeps the doctor away'],
    ['LEMON', '🍋', 'Sour yellow fruit'], ['MELON', '🍈', 'Big juicy fruit'], ['GRAPE', '🍇', 'Grows in bunches'], ['PEACH', '🍑', 'Soft fuzzy fruit'],
    ['ONION', '🧅', 'Makes you cry'], ['PIZZA', '🍕', 'Italian dish'], ['HONEY', '🍯', 'Bees make it'], ['CANDY', '🍬', 'A sweet treat'],
    ['PASTA', '🍝', 'Spaghetti is one'], ['SALAD', '🥗', 'Bowl of lettuce'], ['TRAIN', '🚂', 'Runs on rails'], ['PLANE', '✈️', 'Flies in the sky'],
    ['TRUCK', '🚚', 'A big lorry'], ['HOUSE', '🏠', 'Home sweet home'], ['CLOCK', '🕰️', 'Tells the time'], ['SPOON', '🥄', 'Eat soup with it'],
    ['KNIFE', '🔪', 'Cuts food'], ['CHAIR', '🪑', 'Sit on it'], ['PIANO', '🎹', 'Black and white keys'], ['BRUSH', '🖌️', 'Paint with it'],
    ['DRESS', '👗', 'Worn to a party'], ['GLOVE', '🧤', 'Keeps a hand warm'], ['SCARF', '🧣', 'Warm round your neck'], ['CROWN', '👑', 'A king wears it'],
    ['HEART', '💗', 'Beats in your chest'], ['CLOUD', '☁️', 'Fluffy in the sky'], ['STORM', '⛈️', 'Thunder and lightning'], ['BEACH', '🏖️', 'Sand by the sea'],
    ['OCEAN', '🌊', 'Very big sea'], ['DAISY', '🌼', 'Small white flower'], ['TULIP', '🌷', 'Spring flower'], ['ROBOT', '🤖', 'Machine helper'],
    ['GHOST', '👻', 'Says boo'], ['MOUTH', '👄', 'You eat with it'], ['TOOTH', '🦷', 'Brush it twice a day'], ['CHILD', '🧒', 'Young person'],
    ['RADIO', '📻', 'Listen to it'], ['PHONE', '📞', 'Ring ring'], ['WATCH', '⌚', 'Worn on the wrist'], ['TORCH', '🔦', 'Light in the dark'],
    ['MEDAL', '🏅', 'Prize for winning'], ['MONEY', '💰', 'Pounds and pence'], ['BROOM', '🧹', 'Sweep with it'], ['SMILE', '😊', 'A happy face'],
    ['BEARD', '🧔', 'Hair on the chin'], ['SHELL', '🐚', 'Find it on the beach'], ['SKATE', '⛸️', 'Glide on ice'], ['CHAIN', '⛓️', 'Linked rings'],
    ['QUEEN', '👸', 'Wears a crown too'], ['TOAST', '🥂', 'Raise a glass'], ['CHESS', '♟️', 'Kings and pawns game'], ['DANCE', '💃', 'Move to music'],
    ['MUSIC', '🎼', 'Songs and tunes'], ['JUICE', '🧃', 'Drink from fruit'], ['CHICK', '🐥', 'Baby chicken'], ['BUNNY', '🐰', 'A rabbit'],
    ['FAIRY', '🧚', 'Tiny, with wings'], ['ANGEL', '😇', 'Has a halo'], ['KOALA', '🐨', 'Australian tree bear'], ['HIPPO', '🦛', 'Big river animal'],
    ['BACON', '🥓', 'Sizzles with eggs'], ['MANGO', '🥭', 'Tropical fruit'], ['SPADE', '♠️', 'Card suit'], ['PAINT', '🎨', 'An artist uses it'],
    ['EARTH', '🌍', 'Our planet'], ['CANOE', '🛶', 'Paddle it'], ['SHIRT', '👕', 'Has a collar'], ['JEANS', '👖', 'Blue denim trousers'],
    ['WITCH', '🧙', 'Rides a broomstick'], ['IGLOO', '🧊', 'Ice house'], ['TEETH', '😁', 'Show them when you grin'],
    ['RABBIT', '🐇', 'Long ears, hops'], ['MONKEY', '🐒', 'Swings in trees'], ['TURTLE', '🐢', 'Slow, with a shell'], ['PARROT', '🦜', 'Bird that talks'],
    ['CHEESE', '🧀', 'Made from milk'], ['CARROT', '🥕', 'Orange root veg'], ['BANANA', '🍌', 'Yellow and curved'], ['CHERRY', '🍒', 'Small red fruit'],
    ['POTATO', '🥔', 'Mash it or roast it'], ['COOKIE', '🍪', 'A biscuit'], ['BUTTER', '🧈', 'Spread on bread'], ['ORANGE', '🍊', 'Juicy citrus fruit'],
    ['FLOWER', '🌸', 'Grows in the garden'], ['PENCIL', '✏️', 'Draw with it'], ['CANDLE', '🕯️', 'Has a wick'], ['GUITAR', '🎸', 'Strum it'],
    ['ROCKET', '🚀', 'Goes to space'], ['SPIDER', '🕷️', 'Has eight legs'], ['DRAGON', '🐉', 'Breathes fire'], ['CASTLE', '🏰', 'Home of a king'],
    ['BASKET', '🧺', 'Carry a picnic in it'], ['ANCHOR', '⚓', 'Stops a ship'], ['BRIDGE', '🌉', 'Crosses a river'], ['CAMERA', '📷', 'Takes photos'],
    ['TICKET', '🎟️', 'Lets you in'], ['TROPHY', '🏆', 'Winner’s cup'], ['TOMATO', '🍅', 'Red salad fruit'], ['PUZZLE', '🧩', 'Fit the pieces'],
    ['KITTEN', '🐈', 'Baby cat'], ['LETTER', '✉️', 'Post it'], ['PIRATE', '🏴‍☠️', 'Sails for treasure'], ['HAMMER', '🔨', 'Hits nails'],
    ['TENNIS', '🎾', 'Game with rackets'], ['WIZARD', '🧙', 'Waves a magic wand'], ['MAGNET', '🧲', 'Sticks to the fridge'], ['CACTUS', '🌵', 'Prickly desert plant'],
    ['MUFFIN', '🧁', 'Little cake'], ['GARLIC', '🧄', 'Strong-smelling bulb'], ['PEPPER', '🌶️', 'Hot and spicy'], ['TURKEY', '🦃', 'Christmas dinner bird'],
    ['PENGUIN', '🐧', 'Bird in a dinner suit'], ['OCTOPUS', '🐙', 'Has eight arms'], ['DOLPHIN', '🐬', 'Clever sea animal'], ['RAINBOW', '🌈', 'Colours after rain'],
    ['PUMPKIN', '🎃', 'Big orange vegetable'], ['GIRAFFE', '🦒', 'Very long neck'], ['BALLOON', '🎈', 'Fill it with air'], ['TRACTOR', '🚜', 'Farm vehicle'],
    ['POPCORN', '🍿', 'Snack at the cinema'], ['CHICKEN', '🐔', 'Clucks in the yard'], ['LOBSTER', '🦞', 'Red, with big claws'], ['CRICKET', '🏏', 'Bat, ball and wickets']
  ].filter(p => !BAD.has(p[0]));

  // Familiar seven-letter words that seed Word Builder letter sets.
  const SEEDS = ('PAINTER TOASTER HAMSTER PLASTER LANTERN PARENTS PLANETS ROASTED STATION WEATHER HARVEST KITCHEN CHAPTER MONSTER ' +
    'SWEATER READING HEATING SEATING GRANITE ORANGES MARBLES POSTMAN SAILORS TEAPOTS THREADS TRAINED WINTERS CARPETS CASTLES ' +
    'DANCERS FARMERS PASTIME PICTURE LEATHER COTTAGE BLANKET RAINBOW ORCHARD CUSTARD BUTTONS CRUMPET TEACUPS KETTLES PIGEONS ' +
    'SPANIEL SEASIDE GARDENS SINGERS BAKERS PARSNIP PEANUTS ROOSTER STABLES SHELTER LETTERS DRAWERS SLIPPER BEACHES TRAMPLE ' +
    'PANTRIES TEASPOON MEADOWS').split(' ').filter(w => w.length === 7);

  let DICT = null;
  function dict() {
    if (DICT) return DICT;
    DICT = new Set();
    DICT_SRC.forEach(s => s.trim().split(/\s+/).forEach(w => { w = w.toUpperCase(); if (/^[A-Z]+$/.test(w) && !BAD.has(w)) DICT.add(w); }));
    PICS.forEach(p => DICT.add(p[0]));
    SEEDS.forEach(w => DICT.add(w));
    return DICT;
  }
  function isWordLoose(w) {
    const D = dict();
    if (BAD.has(w)) return false;
    if (D.has(w)) return true;
    if (w.length >= 4 && w.endsWith('S') && !w.endsWith('SS') && D.has(w.slice(0, -1))) return true;
    if (w.length >= 5 && w.endsWith('ES') && D.has(w.slice(0, -2))) return true;
    return false;
  }

  // Well-known sayings, written out in full.
  const SAYINGS = [
    'Practice makes perfect', 'Home sweet home', 'Time is money', 'Knowledge is power', 'Seeing is believing', 'Less is more',
    'Haste makes waste', 'Love is blind', 'Live and learn', 'Silence is golden', 'Every little helps', 'Ignorance is bliss',
    'Look before you leap', 'Better late than never', 'Old habits die hard', 'Still waters run deep', 'Easy come, easy go',
    'Waste not, want not', 'First come, first served', 'Better safe than sorry', 'Patience is a virtue', 'Great minds think alike',
    'Fortune favours the brave', 'Charity begins at home', 'The more the merrier', 'Tomorrow is another day', 'Lightning never strikes twice',
    'Once in a blue moon', 'No news is good news', 'All’s well that ends well', 'Many hands make light work', 'Laughter is the best medicine',
    'Honesty is the best policy', 'Beauty is only skin deep', 'A watched pot never boils', 'It takes two to tango', 'Every dog has its day',
    'When it rains, it pours', 'Don’t cry over spilt milk', 'There’s no place like home', 'Actions speak louder than words',
    'Money doesn’t grow on trees', 'Every picture tells a story', 'One good turn deserves another', 'Blood is thicker than water',
    'Rome wasn’t built in a day', 'Slow and steady wins the race', 'Every cloud has a silver lining', 'The early bird catches the worm',
    'A stitch in time saves nine', 'Too many cooks spoil the broth', 'Absence makes the heart grow fonder', 'Strike while the iron is hot',
    'Make hay while the sun shines', 'Out of sight, out of mind', 'Birds of a feather flock together', 'Necessity is the mother of invention',
    'Two heads are better than one', 'Variety is the spice of life', 'All that glitters is not gold', 'Early to bed, early to rise',
    'Home is where the heart is', 'There’s no time like the present', 'It never rains but it pours', 'Two wrongs don’t make a right',
    'Where there’s a will, there’s a way', 'The pen is mightier than the sword', 'Don’t count your chickens before they hatch',
    'A penny saved is a penny earned', 'Good things come to those who wait', 'Don’t judge a book by its cover',
    'Half a loaf is better than none', 'An apple a day keeps the doctor away', 'Don’t put all your eggs in one basket',
    'A friend in need is a friend indeed', 'You can’t have your cake and eat it', 'Many a true word is spoken in jest',
    'The grass is always greener on the other side', 'The proof of the pudding is in the eating', 'A bird in the hand is worth two in the bush'
  ];

  /* =========================================================
     STYLES
     ========================================================= */
  R.css(`
.w3-pick{display:grid; grid-template-columns:repeat(7, minmax(0, 1fr)); gap:7px; width:min(100%, 440px); margin:0 auto;
  padding:10px; border-radius:22px; background:rgba(0,0,0,.2); box-shadow:inset 0 3px 10px rgba(0,0,0,.25)}
.w3-key{position:relative; height:56px; min-width:0; padding:0; font:700 1.65rem/1 var(--display); border-radius:14px; cursor:pointer;
  box-shadow:inset 0 -4px 0 rgba(0,0,0,.12), inset 0 2px 0 rgba(255,255,255,.5), 0 5px 0 var(--d, var(--card-edge)), 0 8px 12px rgba(0,0,0,.25)}
.w3-key.go{animation:pop .25s}
.w3-key.wide{grid-column:span 2; font-size:1.2rem}
.w3-key.hit{--c:var(--leaf); --d:var(--leaf-d); color:#fff; pointer-events:none}
.w3-key.hit::after{content:'✓'; position:absolute; right:2px; top:1px; font:700 .8rem/1 var(--body)}
.w3-key.wilt{animation:w3-wilt .8s ease-out forwards; filter:grayscale(1); opacity:.4; pointer-events:none}
@keyframes w3-wilt{0%{transform:none} 35%{transform:rotate(-7deg) translateY(2px)} 100%{transform:rotate(5deg) translateY(4px) scale(.92)}}
.w3-tools{display:flex; flex-wrap:wrap; justify-content:center; gap:10px}
.w3-tools .btn{min-height:58px; font-size:1.1rem; padding:.55em .95em}
.w3-tools .btn[disabled]{opacity:.4; pointer-events:none}
@keyframes w3-rise{0%{transform:translateY(0)} 40%{transform:translateY(-12px) scale(1.12)} 100%{transform:translateY(0)}}
.w3-win{animation:w3-rise .45s ease-out}

/* Guess the Word */
.gw-wrap{display:flex; flex-direction:column; align-items:center; gap:12px; max-width:640px; margin:0 auto}
.gw-top{display:flex; align-items:flex-end; justify-content:center; gap:22px; width:100%}
.gw-pic{position:relative; width:118px; height:118px; border-radius:24px; font-size:70px; line-height:1}
.gw-pic.hid{--c:var(--grape); --d:var(--grape-d); color:#fff; font:700 3.6rem/1 var(--display)}
.gw-pic.show span{animation:bounceIn .5s}
.gw-pic .gw-cnt{position:absolute; bottom:-12px; left:50%; transform:translateX(-50%); white-space:nowrap; background:var(--ink); color:#fff;
  font:700 .95rem/1 var(--body); padding:5px 10px; border-radius:999px}
.gw-flower{position:relative; width:124px; height:150px; flex:none}
.gw-head{position:absolute; left:50%; top:0; width:110px; height:110px; margin-left:-55px; z-index:2; transition:transform .5s}
.gw-pet{position:absolute; left:50%; top:50%; width:32px; height:48px; margin:-48px 0 0 -16px; border-radius:50% 50% 45% 45% / 62% 62% 38% 38%;
  transform-origin:50% 100%; transform:rotate(var(--a)) scale(.72); background:rgba(255,255,255,.14); box-shadow:inset 0 0 0 3px rgba(255,255,255,.45);
  transition:transform .5s cubic-bezier(.3,1.7,.5,1), background .3s}
.gw-pet.on{transform:rotate(var(--a)) scale(1); background:linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,0) 65%), var(--pc);
  box-shadow:inset 0 -4px 0 rgba(0,0,0,.14), 0 2px 4px rgba(0,0,0,.2)}
.gw-mid{position:absolute; left:50%; top:50%; width:40px; height:40px; margin:-20px 0 0 -20px; border-radius:50%; background:var(--sun);
  box-shadow:inset 0 -4px 0 var(--sun-d), 0 3px 6px rgba(0,0,0,.3); display:grid; place-items:center; font:700 1rem/1 var(--display); color:var(--ink)}
.gw-stem{position:absolute; left:50%; top:62px; width:8px; height:62px; margin-left:-4px; background:var(--leaf-d); border-radius:4px}
.gw-leaf{position:absolute; top:92px; width:30px; height:16px; border-radius:50%; background:var(--leaf); box-shadow:inset 0 -3px 0 var(--leaf-d)}
.gw-leaf.l{left:28px; transform:rotate(-25deg)} .gw-leaf.r{right:28px; transform:rotate(25deg)}
.gw-pot{position:absolute; left:50%; bottom:0; width:66px; height:32px; margin-left:-33px; background:var(--orange); clip-path:polygon(0 0, 100% 0, 86% 100%, 14% 100%);
  box-shadow:inset 0 7px 0 var(--orange-d)}
.gw-flower.bloom .gw-head{animation:gw-bloom .9s ease-in-out}
@keyframes gw-bloom{0%{transform:none} 30%{transform:scale(1.18) rotate(-12deg)} 60%{transform:scale(1.1) rotate(10deg)} 100%{transform:none}}
.gw-flower.sad .gw-head{animation:gw-sway .7s ease-in-out}
@keyframes gw-sway{30%{transform:rotate(-6deg) translateY(3px)} 70%{transform:rotate(4deg)}}
.gw-slots{display:grid; grid-template-columns:repeat(var(--n), minmax(0, 52px)); gap:7px; width:min(100%, calc(var(--n) * 59px)); justify-content:center}
.gw-s{aspect-ratio:.86; min-width:0; font:700 2rem/1 var(--display); border-radius:14px; position:relative}
.gw-s.empty{background:rgba(255,255,255,.13); box-shadow:inset 0 0 0 3px rgba(255,255,255,.32)}
.gw-s.empty::after{content:''; position:absolute; left:24%; right:24%; bottom:16%; height:4px; border-radius:2px; background:rgba(255,255,255,.55)}
.gw-s.fill{--c:var(--sun); --d:var(--sun-d); animation:bounceIn .3s}
.gw-s.win{--c:var(--leaf); --d:var(--leaf-d); color:#fff}

/* Saying Scramble */
.ss-wrap{display:flex; flex-direction:column; align-items:center; gap:14px; max-width:760px; margin:0 auto}
.ss-card{width:100%; background:var(--card); border-radius:24px; padding:16px 12px; box-shadow:0 6px 0 var(--card-edge), 0 12px 22px rgba(0,0,0,.25);
  display:flex; flex-wrap:wrap; justify-content:center; gap:12px 8px; min-height:88px}
.ss-slot{min-width:62px; height:56px; padding:0 13px; font:600 1.35rem/1 var(--display); border-radius:14px; cursor:pointer}
.ss-slot.empty{background:#F2E8D6; box-shadow:inset 0 3px 6px rgba(0,0,0,.1); outline:3px dashed #CDBB9A; outline-offset:-3px; color:#A8977A}
.ss-slot.fill{--c:var(--sun); --d:var(--sun-d); animation:bounceIn .25s}
.ss-slot.lock{--c:var(--leaf); --d:var(--leaf-d); color:#fff; cursor:default}
.ss-slot.wrong{--c:var(--peach); --d:var(--peach-d)}
.ss-slot.next{outline-color:var(--coral)}
.ss-pool{display:flex; flex-wrap:wrap; justify-content:center; gap:14px 10px; min-height:66px; width:100%}
.ss-w{height:60px; padding:0 16px; font:600 1.4rem/1 var(--display); border-radius:16px; cursor:pointer; animation:bounceIn .25s}
.ss-done{font:700 1.4rem var(--display); color:var(--sun)}

/* Word Builder */
.wb-wrap{display:flex; flex-direction:column; align-items:center; gap:12px; max-width:640px; margin:0 auto}
.wb-goal{display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:6px 8px; font:600 1.2rem var(--display)}
.wb-pip{width:26px; height:26px; border-radius:50%; background:rgba(255,255,255,.18); box-shadow:inset 0 0 0 3px rgba(255,255,255,.35); display:grid; place-items:center; font:700 .9rem/1 var(--body)}
.wb-pip.on{background:var(--leaf); box-shadow:0 3px 0 var(--leaf-d); color:#fff; animation:bounceIn .35s}
.wb-row{display:flex; align-items:center; justify-content:center; gap:8px; width:100%}
.wb-tray{flex:1 1 auto; max-width:380px; min-height:66px; display:flex; justify-content:center; align-items:center; gap:4px; padding:8px; border-radius:18px;
  background:rgba(0,0,0,.24); box-shadow:inset 0 4px 12px rgba(0,0,0,.3)}
.wb-tray .wb-l{width:40px; height:50px; font:700 1.7rem/1 var(--display); border-radius:12px; --c:var(--sun); --d:var(--sun-d); animation:bounceIn .2s}
.wb-tray .wb-ph{color:var(--on-table-soft); font:600 1.1rem var(--display)}
.wb-tray.good .wb-l{--c:var(--leaf); --d:var(--leaf-d); color:#fff}
.wb-tray.bad .wb-l{--c:var(--peach); --d:var(--peach-d)}
.wb-sq{width:60px; height:60px; min-height:0; padding:0; font-size:1.6rem; flex:none}
.wb-tiles{display:flex; flex-wrap:wrap; justify-content:center; gap:14px 12px; max-width:330px}
.wb-t{position:relative; width:66px; height:66px; padding:0; font:700 2.4rem/1 var(--display); cursor:pointer; transition:transform .15s, opacity .15s}
.wb-t.key{outline:4px solid #fff; outline-offset:2px}
.wb-t.key::after{content:'★'; position:absolute; top:-12px; right:-12px; width:28px; height:28px; border-radius:50%; background:var(--ink); color:var(--sun); font:700 1.05rem/28px var(--body)}
.wb-t.used{opacity:.3; transform:translateY(5px) scale(.9)}
.wb-t.glow{animation:w3-rise .6s ease-out 2}
.wb-found{display:flex; flex-wrap:wrap; justify-content:center; gap:8px; max-width:600px; min-height:40px}
.wb-chip{padding:7px 13px; border-radius:14px; background:var(--leaf); color:#fff; font:700 1.2rem/1.1 var(--display); letter-spacing:.05em; box-shadow:0 4px 0 var(--leaf-d); animation:bounceIn .3s}
.wb-chip::before{content:'✓ '}

/* Times Tables */
.tt-wrap{display:flex; flex-direction:column; align-items:center; gap:14px; max-width:680px; margin:0 auto}
.tt-card{width:100%; background:var(--card); color:var(--ink); border-radius:24px; padding:14px 12px; box-shadow:0 6px 0 var(--card-edge), 0 12px 22px rgba(0,0,0,.25);
  display:flex; flex-direction:column; align-items:center; gap:8px}
.tt-groups{display:flex; flex-wrap:wrap; justify-content:center; align-items:flex-end; gap:16px 12px; padding-top:10px}
.tt-bag{position:relative; display:grid; grid-template-columns:repeat(var(--k), auto); gap:1px 2px; padding:10px 8px 7px; border-radius:12px 12px 20px 20px;
  background:linear-gradient(155deg, rgba(255,255,255,.45), rgba(255,255,255,0) 55%), var(--c); box-shadow:inset 0 -4px 0 rgba(0,0,0,.14), 0 5px 0 var(--d), 0 8px 12px rgba(0,0,0,.18);
  font-size:21px; line-height:1.15; animation:bounceIn .35s both}
.tt-bag::before{content:''; position:absolute; top:-13px; left:28%; right:28%; height:16px; border:4px solid var(--d); border-bottom:0; border-radius:12px 12px 0 0}
.tt-bag .tt-sym{position:absolute; bottom:-4px; right:-6px; width:22px; height:22px; border-radius:50%; background:#fff; color:var(--d); font:700 .8rem/22px var(--body); text-align:center; box-shadow:0 2px 3px rgba(0,0,0,.25)}
.tt-bag.lab{grid-template-columns:auto auto; align-items:center; gap:4px; font-size:26px}
.tt-bag.lab b{font:700 1.7rem/1 var(--display)}
.tt-eq{font:700 clamp(2.2rem, 10vw, 3rem)/1.1 var(--display); letter-spacing:.02em}
.tt-eq .q{display:inline-block; min-width:1.4em; padding:0 .2em; border-radius:12px; background:#F2E8D6; color:var(--coral-d)}
.tt-eq .q.ok{background:var(--good-bg); color:var(--leaf-d); animation:bounceIn .4s}
.tt-say{font:600 1.2rem/1.25 var(--display); color:var(--ink-soft); text-align:center}
.tt-opts{display:grid; grid-template-columns:repeat(var(--n), 1fr); gap:12px; width:100%; max-width:560px}
.tt-o{min-height:78px; padding:0; font:700 2rem var(--display)}
.tt-o.right{--c:var(--leaf); --d:var(--leaf-d); color:#fff}
.tt-o.nope{opacity:.32; pointer-events:none}

/* Number Line */
.nl-wrap{display:flex; flex-direction:column; align-items:center; gap:14px; max-width:700px; margin:0 auto}
.nl-ask{display:flex; align-items:center; justify-content:center; gap:14px; font:600 1.35rem var(--display)}
.nl-ask .tile{min-width:100px; height:82px; padding:0 16px; font:700 2.7rem/1 var(--display); --c:var(--sun); --d:var(--sun-d); animation:bounceIn .4s}
.nl-line{position:relative; width:100%; height:176px; cursor:pointer; border-radius:22px; background:rgba(0,0,0,.18); box-shadow:inset 0 4px 10px rgba(0,0,0,.25);
  -webkit-tap-highlight-color:transparent; touch-action:manipulation}
.nl-line.off{cursor:default}
.nl-bar{position:absolute; left:5%; right:5%; top:106px; height:10px; margin-top:-5px; border-radius:5px; background:#fff; box-shadow:0 4px 0 rgba(0,0,0,.25)}
.nl-tick{position:absolute; top:106px; width:4px; height:18px; margin:-9px 0 0 -2px; background:#fff; border-radius:2px; pointer-events:none}
.nl-tick.maj{width:6px; height:30px; margin:-15px 0 0 -3px}
.nl-lab{position:absolute; top:124px; transform:translateX(-50%); font:700 1.25rem/1 var(--display); color:#fff; white-space:nowrap; pointer-events:none}
.nl-lab.low{top:148px}
.nl-lab.gap{color:transparent; width:26px; height:24px; border-radius:7px; outline:3px dashed rgba(255,255,255,.6)}
.nl-flag{position:absolute; transform:translateX(-50%); min-width:46px; height:42px; padding:0 8px; display:grid; place-items:center; border-radius:12px;
  font:700 1.35rem/1 var(--display); pointer-events:none; animation:drop .4s both; z-index:2}
.nl-flag::after{content:''; position:absolute; left:50%; top:100%; width:4px; height:var(--st, 20px); margin-left:-2px; background:var(--d); border-radius:2px}
.nl-flag.ok{--c:var(--leaf); --d:var(--leaf-d); color:#fff}
.nl-flag.miss{--c:var(--peach); --d:var(--peach-d); transition:opacity .5s}
.nl-flag.fade{opacity:0}
.nl-pool{display:flex; flex-wrap:wrap; justify-content:center; gap:14px; min-height:76px}
.nl-card{min-width:76px; height:72px; padding:0 12px; font:700 2.2rem/1 var(--display); cursor:pointer; animation:bounceIn .3s both}
.nl-card.gone{visibility:hidden; pointer-events:none}
@media (max-width:520px){ .w3-key{height:52px; font-size:1.45rem} .w3-pick{gap:6px; padding:8px} .tt-o{font-size:1.75rem; min-height:70px}
  .gw-pic{width:104px; height:104px; font-size:60px} .nl-lab{font-size:1.1rem} }
`);

  register({ id: 'guess', cat: 'words', order: 10, name: 'Guess the Word', icon: '🌼', desc: 'Pick letters to fill in the picture word', gentle: true, start: startGuess });
  register({ id: 'scramble', cat: 'words', order: 11, name: 'Saying Scramble', icon: '🔀', desc: 'Put the words of an old saying in order', gentle: false, start: startScramble });
  register({ id: 'builder', cat: 'words', order: 12, name: 'Word Builder', icon: '🧱', desc: 'Make words from seven letters', gentle: false, start: startBuilder });
  register({ id: 'times', cat: 'numbers', order: 4, name: 'Times Tables', icon: '✖️', desc: 'Gentle times tables with pictures', gentle: true, start: startTimes });
  register({ id: 'numline', cat: 'numbers', order: 5, name: 'Number Line', icon: '📏', desc: 'Put numbers in their place on the line', gentle: false, start: startNumline });

  /* ---------- shared bits ---------- */
  function btn(label, cls, fn) { const b = el('button', 'btn ' + cls, label); b.type = 'button'; b.onclick = fn; return b; }
  function happyRun(n, base) { for (let k = 0; k < n; k++) tone(base * Math.pow(1.122, k), .12, 'triangle', .09, k * .07); }
  const lvl = L => Math.max(1, Math.floor(L) || 1);
  function makePicker(onPick, extra) {
    const box = el('div', 'w3-pick'), keys = {};
    for (const ch of AZ) {
      const b = el('button', 'w3-key tile c-card press', ch); b.type = 'button'; b.setAttribute('aria-label', 'Letter ' + ch);
      b.onclick = () => { b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); onPick(ch); };
      keys[ch] = b; box.append(b);
    }
    (extra || []).forEach(x => { const b = el('button', 'w3-key tile press wide ' + (x.cls || 'c-peach'), x.label); b.type = 'button'; b.setAttribute('aria-label', x.aria || x.label); b.onclick = x.fn; box.append(b); x.el = b; });
    return { el: box, keys };
  }
  function avoidRecent(key, items, idOf, keep) {
    const recent = store.get(key, []);
    const fresh = items.filter(x => !recent.includes(idOf(x)));
    return { list: fresh, save: chosen => store.set(key, chosen.map(idOf).concat(recent).slice(0, keep)) };
  }

  /* =========================================================
     GUESS THE WORD
     ========================================================= */
  const GUESS_SKIP = new Set(['SAD', 'HOT', 'RED', 'WET', 'MUD', 'PEA', 'TEN', 'DAY', 'MAN', 'BOY', 'SIX', 'ROW', 'DEW', 'SPY', 'GYM', 'KID', 'CLAP', 'WAVE', 'LOVE',
    'KISS', 'TOAST', 'NOTE', 'SING', 'CLUB', 'SPADE', 'HERO', 'MOTH', 'WIND', 'FARM', 'CARD', 'GOLD', 'ANGEL', 'GHOST', 'EARTH', 'IGLOO', 'TEETH', 'WITCH', 'WIZARD', 'DRAGON', 'MUSIC', 'SMILE', 'MONEY', 'CANDY', 'COOKIE', 'MASK', 'CHAIN', 'HOME', 'FILM', 'SURF', 'ROBOT', 'PIRATE']);
  const GUESS_PICS = PICS.filter(p => !GUESS_SKIP.has(p[0]) && p[0].length >= 3 && p[0].length <= 7);
  const PETAL_COLS = ['var(--coral)', 'var(--berry)', 'var(--sky)', 'var(--grape)', 'var(--orange)', 'var(--rose)', 'var(--sun)'];
  function guessLens(L) {
    if (L <= 1) return [3];
    if (L === 2) return [3, 4];
    if (L === 3) return [4];
    if (L === 4) return [4, 5];
    if (L === 5) return [5];
    if (L <= 7) return [5, 6];
    return [5, 6, 7];
  }
  function startGuess(L, api) {
    L = lvl(L);
    const total = 3, lens = guessLens(L);
    const all = GUESS_PICS.filter(p => lens.includes(p[0].length));
    const rec = avoidRecent('w3-guess', all, p => p[0], 40);
    let pool = shuffle(rec.list.length >= total ? rec.list : all.slice());
    const picks = [];
    for (const p of pool) { if (picks.length < total && !picks.some(q => q[1] === p[1])) picks.push(p); }
    picks.sort((a, b) => a[0].length - b[0].length);
    rec.save(picks);
    let round = 0, mistakes = 0, helps = 0;
    api.rounds(total, 0);

    function play() {
      api.stage.innerHTML = '';
      const [word, emoji, clue] = picks[round];
      api.stage.dataset.ans = word;
      const need = [...new Set(word)];
      const showAfter = L <= 2 ? 0 : L <= 4 ? 1 : L <= 6 ? 2 : Math.ceil(need.length / 2);
      const got = new Set(), tried = new Set();
      let picShown = showAfter === 0, busy = false;

      const wrap = el('div', 'gw-wrap'), top = el('div', 'gw-top');
      const pic = el('div', 'gw-pic tile c-card');
      const flower = el('div', 'gw-flower');
      const head = el('div', 'gw-head');
      const petals = need.map((_, i) => {
        const p = el('span', 'gw-pet'); p.style.setProperty('--a', (360 * i / need.length) + 'deg'); p.style.setProperty('--pc', PETAL_COLS[(i + round * 2) % PETAL_COLS.length]);
        head.append(p); return p;
      });
      const mid = el('span', 'gw-mid', ''); head.append(mid);
      flower.append(el('div', 'gw-stem'), el('div', 'gw-leaf l'), el('div', 'gw-leaf r'), el('div', 'gw-pot'), head);
      flower.setAttribute('aria-label', 'Flower: one petal for each right letter');
      top.append(pic, flower);
      const slots = el('div', 'gw-slots'); slots.style.setProperty('--n', word.length);
      const sEls = [...word].map(() => { const s = el('div', 'gw-s tile empty'); slots.append(s); return s; });
      const helpX = { label: '💡 Help', cls: 'c-sun', aria: 'Help me', fn: help };
      const pk = makePicker(onLetter, [helpX]);
      wrap.append(top, slots, pk.el);
      api.stage.append(wrap);

      function paintPic() {
        if (picShown) { pic.className = 'gw-pic tile c-card show'; pic.innerHTML = `<span>${emoji}</span>`; pic.setAttribute('aria-label', 'Picture clue: ' + clue); }
        else {
          const left = showAfter - got.size;
          pic.className = 'gw-pic tile hid'; pic.innerHTML = `?<span class="gw-cnt">🖼️ in ${left} letter${left === 1 ? '' : 's'}</span>`;
          pic.setAttribute('aria-label', 'The picture will show after ' + left + ' more right letters');
        }
      }
      function paint() {
        [...word].forEach((ch, k) => {
          const s = sEls[k], on = got.has(ch);
          const was = s.classList.contains('fill');
          s.className = 'gw-s tile ' + (on ? 'fill' : 'empty');
          if (on && was) s.style.animation = 'none';
          s.textContent = on ? ch : '';
          s.setAttribute('aria-label', on ? ch : 'blank');
        });
        petals.forEach((p, i) => p.classList.toggle('on', i < got.size));
        mid.textContent = got.size === need.length ? '☺' : '';
        paintPic();
      }
      const baseHint = () => api.hint(picShown ? `What is the picture? Tap letters to spell it. It has ${word.length} letters.`
        : `Clue: ${clue}. Tap letters to fill the gaps. The picture comes later.`);
      function onLetter(ch, viaHelp) {
        if (busy || tried.has(ch)) return;
        tried.add(ch);
        const key = pk.keys[ch];
        if (word.includes(ch)) {
          got.add(ch); key.classList.add('hit');
          tone(440 * Math.pow(1.122, got.size), .16, 'triangle', .12);
          if (!picShown && got.size >= showAfter) { picShown = true; }
          paint();
          if (got.size === need.length) return winRound();
          const n = [...word].filter(c => c === ch).length;
          api.hint(viaHelp ? `Here is a ${ch}. ${picShown ? 'Keep going!' : 'Clue: ' + clue + '.'}` : `Yes! ${n > 1 ? 'There are ' + n + ' ' + ch + 's' : 'There is a ' + ch}. ${picShown ? 'What else?' : 'Clue: ' + clue + '.'}`);
        } else {
          mistakes++; key.classList.add('wilt'); sfx.soft();
          flower.classList.remove('sad'); void flower.offsetWidth; flower.classList.add('sad');
          api.hint(`No ${ch} in this word. That’s fine, try another letter.`);
        }
      }
      function help() {
        if (busy) return;
        helps++; sfx.tap();
        if (!picShown) { picShown = true; paint(); baseHint(); return; }
        // reveal the letter that fills most gaps
        const left = need.filter(c => !got.has(c));
        left.sort((a, b) => [...word].filter(c => c === b).length - [...word].filter(c => c === a).length);
        onLetter(left[0], true);
      }
      function winRound() {
        busy = true; round++;
        sEls.forEach((s, k) => later(() => { s.classList.add('win', 'w3-win'); }, k * 70));
        flower.classList.add('bloom');
        happyRun(5, 523); api.rounds(total, round);
        api.hint(`${word}! ${cheer()}`);
        Object.values(pk.keys).forEach(k => { k.style.pointerEvents = 'none'; });
        if (round === total) {
          const m = mistakes + helps, a = L <= 2 ? total : total * 3, b = L <= 2 ? total * 3 : total * 7;
          api.later(() => api.done(starsFor(m, a, b)), 1300);
        } else { toast(cheer()); api.later(play, 1700); }
      }
      function later(fn, ms) { api.later(fn, ms); }
      paint(); baseHint();
    }
    play();
  }

  /* =========================================================
     SAYING SCRAMBLE
     ========================================================= */
  const sayWords = s => s.split(' ');
  function scrambleRange(L) {
    if (L <= 1) return [3, 4];
    if (L === 2) return [4, 5];
    if (L === 3) return [5, 6];
    if (L <= 5) return [5, 7];
    if (L <= 7) return [6, 8];
    return [6, 11];
  }
  const TILE_COLS = ['c-sky', 'c-berry', 'c-orange', 'c-grape', 'c-mint', 'c-coral', 'c-peach', 'c-rose'];
  function startScramble(L, api) {
    L = lvl(L);
    const total = 3, [lo, hi] = scrambleRange(L);
    const all = SAYINGS.filter(s => { const n = sayWords(s).length; return n >= lo && n <= hi; });
    const rec = avoidRecent('w3-scr', all, s => s, 30);
    const picks = shuffle(rec.list.length >= total ? rec.list : all.slice()).slice(0, total).sort((a, b) => sayWords(a).length - sayWords(b).length);
    rec.save(picks);
    let round = 0, mistakes = 0, helps = 0;
    api.rounds(total, 0);

    function play() {
      api.stage.innerHTML = '';
      const words = sayWords(picks[round]), n = words.length;
      api.stage.dataset.ans = JSON.stringify(words);
      let order = shuffle(words.map((_, i) => i));
      for (let t = 0; t < 20 && order.every((i, k) => words[i] === words[k]); t++) shuffle(order);
      const tiles = order.map((i, k) => ({ text: words[i], col: TILE_COLS[k % TILE_COLS.length] }));
      const slots = Array(n).fill(null), locked = Array(n).fill(false);
      let busy = false;

      const wrap = el('div', 'ss-wrap'), card = el('div', 'ss-card'), poolEl = el('div', 'ss-pool');
      const slotEls = words.map((_, k) => { const b = el('button', 'ss-slot tile empty'); b.type = 'button'; b.onclick = () => tapSlot(k); card.append(b); return b; });
      const tools = el('div', 'w3-tools');
      const clearBtn = btn('↶ Start again', 'c-card', clearAll), hintBtn = btn('💡 Next word', 'c-sun', giveHint);
      tools.append(clearBtn, hintBtn);
      wrap.append(card, poolEl, tools);
      api.stage.append(wrap);

      const placed = t => slots.includes(t);
      function paint() {
        const firstEmpty = slots.indexOf(null);
        slots.forEach((t, k) => {
          const e = slotEls[k];
          e.className = 'ss-slot tile ' + (t === null ? 'empty' + (k === firstEmpty ? ' next' : '') : locked[k] ? 'lock' : 'fill');
          e.textContent = t === null ? '' : tiles[t].text;
          e.setAttribute('aria-label', t === null ? `Space ${k + 1}` : `${tiles[t].text}${locked[k] ? ', correct' : '. Tap to send it back'}`);
        });
        poolEl.innerHTML = '';
        tiles.forEach((tl, t) => {
          if (placed(t)) return;
          const b = el('button', 'ss-w tile ' + tl.col, tl.text); b.type = 'button'; b.onclick = () => tapTile(t); poolEl.append(b);
        });
        if (!poolEl.children.length) poolEl.append(el('div', 'ss-done', ''));
        clearBtn.disabled = !slots.some((t, k) => t !== null && !locked[k]);
      }
      function baseHint() {
        api.hint(L <= 2 ? 'Tap the words in order to make the saying. The first word has a capital letter.' : 'Tap the words in order to rebuild the saying. Tap a placed word to send it back.');
      }
      function tapTile(t) {
        if (busy) return;
        const k = slots.indexOf(null); if (k < 0) return;
        sfx.tap(); slots[k] = t; paint();
        if (!slots.includes(null)) check();
      }
      function tapSlot(k) {
        if (busy || slots[k] === null || locked[k]) return;
        sfx.tap(); slots[k] = null; paint(); baseHint();
      }
      function clearAll() { if (busy) return; slots.forEach((t, k) => { if (!locked[k]) slots[k] = null; }); sfx.tap(); paint(); baseHint(); }
      function check() {
        const wrong = [];
        slots.forEach((t, k) => { if (tiles[t].text === words[k]) locked[k] = true; else wrong.push(k); });
        if (!wrong.length) return win();
        mistakes++; busy = true; sfx.soft(); paint();
        wrong.forEach(k => { slotEls[k].classList.add('wrong'); wob(slotEls[k]); });
        api.hint(locked.some(Boolean) ? 'The green words are in the right place. The others go back, so try them again.' : 'Not quite. The words go back so you can try again.');
        api.later(() => { wrong.forEach(k => { slots[k] = null; }); busy = false; paint(); }, 1100);
      }
      function giveHint() {
        if (busy) return;
        const k = locked.indexOf(false); if (k < 0) return;
        helps++;
        // free the slot, then find a tile with the right word (prefer one still in the pool)
        slots[k] = null;
        let t = tiles.findIndex((tl, i) => tl.text === words[k] && !placed(i));
        if (t < 0) { const j = slots.findIndex((s, i) => s !== null && !locked[i] && tiles[s].text === words[k]); t = slots[j]; slots[j] = null; }
        slots[k] = t; locked[k] = true; tone(660, .14, 'triangle', .12);
        api.hint(`The next word is “${words[k]}”.`);
        paint();
        if (!slots.includes(null)) check();
      }
      function win() {
        busy = true; round++; paint();
        slotEls.forEach((e, k) => api.later(() => { e.classList.add('w3-win'); tone(392 * Math.pow(1.09, k), .12, 'triangle', .08); }, k * 90));
        api.rounds(total, round);
        api.hint(`“${words.join(' ')}.” ${cheer()}`);
        clearBtn.disabled = hintBtn.disabled = true;
        if (round === total) api.later(() => api.done(starsFor(mistakes + helps, 1, 3)), n * 90 + 1000);
        else { api.later(() => { sfx.good(); toast(cheer()); }, n * 90); api.later(play, n * 90 + 1900); }
      }
      paint(); baseHint();
    }
    play();
  }

  /* =========================================================
     WORD BUILDER
     ========================================================= */
  let WB_LIST = null;
  const wbList = () => WB_LIST || (WB_LIST = [...dict()].filter(w => w.length >= 3 && w.length <= 7));
  function countOf(s) { const c = {}; for (const ch of s) c[ch] = (c[ch] || 0) + 1; return c; }
  function fits(w, have) { const c = {}; for (const ch of w) { c[ch] = (c[ch] || 0) + 1; if (c[ch] > (have[ch] || 0)) return false; } return true; }
  function builderSpec(L) {
    const N = L <= 1 ? 3 : L === 2 ? 4 : L === 3 ? 5 : L <= 5 ? 6 : L <= 8 ? 7 : 7 + (L % 2);
    return { N, key: L >= 3, minLen: L >= 9 ? 4 : 3 };
  }
  function makeBuilder(spec, avoid) {
    const need = spec.N + 4;
    const seeds = shuffle(SEEDS.filter(s => !avoid.includes(s)).concat([]));
    if (seeds.length < 5) seeds.push(...shuffle(SEEDS.slice()));
    for (const seed of seeds) {
      const have = countOf(seed);
      const words = wbList().filter(w => w.length >= spec.minLen && fits(w, have));
      let key = null, list = words;
      if (spec.key) {
        const opts = shuffle([...new Set(seed)]).map(ch => ({ ch, ws: words.filter(w => w.includes(ch)) })).filter(o => o.ws.length >= need);
        if (!opts.length) continue;
        const o = opts[0]; key = o.ch; list = o.ws;
      }
      if (list.length < need) continue;
      return { seed, key, words: list, letters: shuffle([...seed]) };
    }
    return null;
  }
  function startBuilder(L, api) {
    L = lvl(L);
    const spec = builderSpec(L), recent = store.get('w3-wb', []);
    const P = makeBuilder(spec, recent) || makeBuilder(spec, []);
    store.set('w3-wb', [P.seed].concat(recent).slice(0, 15));
    api.stage.dataset.ans = JSON.stringify(P.words);
    const N = spec.N, found = [];
    let cur = [], mistakes = 0, helps = 0, busy = false, hintWord = null, hintStep = 0, letters = P.letters.slice();
    api.rounds(N, 0);

    const wrap = el('div', 'wb-wrap'), goal = el('div', 'wb-goal');
    const pips = [...Array(N)].map(() => el('span', 'wb-pip'));
    goal.append(el('span', '', 'Words:'), ...pips);
    const row = el('div', 'wb-row'), tray = el('div', 'wb-tray');
    const backBtn = btn('⌫', 'c-card wb-sq', back); backBtn.setAttribute('aria-label', 'Take back a letter');
    const goBtn = btn('✓', 'c-leaf wb-sq', submit); goBtn.setAttribute('aria-label', 'Make this word');
    row.append(backBtn, tray, goBtn);
    const tilesEl = el('div', 'wb-tiles');
    const tools = el('div', 'w3-tools');
    tools.append(btn('🔀 Mix up', 'c-card', mix), btn('💡 Hint', 'c-sun', hint));
    const foundEl = el('div', 'wb-found');
    wrap.append(goal, row, tilesEl, tools, foundEl);
    api.stage.append(wrap);
    let tEls = [];
    const COLS = ['c-sky', 'c-berry', 'c-orange', 'c-grape', 'c-mint', 'c-coral', 'c-rose'];
    function buildTiles() {
      tilesEl.innerHTML = '';
      // key letter first so it sits top-left and is easy to spot
      if (P.key) { const i = letters.indexOf(P.key); letters.splice(i, 1); letters.unshift(P.key); }
      let keyDone = false;
      tEls = letters.map((ch, i) => {
        const isKey = P.key && ch === P.key && !keyDone; if (isKey) keyDone = true;
        const b = el('button', 'wb-t tile ' + (isKey ? 'c-sun key' : COLS[i % COLS.length]), ch); b.type = 'button';
        b.setAttribute('aria-label', 'Letter ' + ch + (isKey ? ', the star letter' : ''));
        b.onclick = () => tap(i); tilesEl.append(b); return b;
      });
    }
    function paint(state) {
      tray.className = 'wb-tray' + (state ? ' ' + state : '');
      tray.innerHTML = cur.length ? cur.map(i => `<span class="wb-l tile">${letters[i]}</span>`).join('') : '<span class="wb-ph">Tap letters to make a word</span>';
      tEls.forEach((b, i) => b.classList.toggle('used', cur.includes(i)));
      pips.forEach((p, k) => { const on = k < found.length; if (on && !p.classList.contains('on')) { p.classList.add('on'); p.textContent = '✓'; } });
      backBtn.disabled = goBtn.disabled = !cur.length;
    }
    function baseHint() {
      const left = N - found.length;
      api.hint(`Make words of ${spec.minLen} letters or more${P.key ? `. Every word must use the ★ letter ${P.key}` : ''}. Find ${left} more.`);
    }
    function tap(i) { if (busy || cur.includes(i)) return; sfx.tap(); cur.push(i); paint(); }
    function back() { if (busy || !cur.length) return; cur.pop(); sfx.tap(); paint(); }
    function mix() {
      if (busy) return; sfx.tap();
      const keep = cur.map(i => letters[i]);
      shuffle(letters); buildTiles();
      // re-map the current word onto the new tile order
      const used = []; cur = keep.map(ch => { const i = letters.findIndex((c, j) => c === ch && !used.includes(j)); used.push(i); return i; });
      paint();
    }
    function hint() {
      if (busy) return;
      sfx.tap(); helps++;
      if (!hintWord || found.includes(hintWord)) {
        const left = P.words.filter(w => !found.includes(w));
        const short = Math.min(...left.map(w => w.length));
        hintWord = pick(left.filter(w => w.length <= short + 1)); hintStep = 0;
      }
      if (hintStep === 0) {
        hintStep = 1;
        api.hint(`Try a ${hintWord.length}-letter word that starts with ${hintWord[0]}.`);
        const i = letters.indexOf(hintWord[0]); const b = tEls[i]; b.classList.remove('glow'); void b.offsetWidth; b.classList.add('glow');
      } else {
        const used = []; cur = [...hintWord].map(ch => { const i = letters.findIndex((c, j) => c === ch && !used.includes(j)); used.push(i); return i; });
        paint(); api.hint(`How about ${hintWord}? Tap ✓ to make it.`);
      }
    }
    function submit() {
      if (busy || !cur.length) return;
      const w = cur.map(i => letters[i]).join('');
      if (w.length < spec.minLen) { sfx.soft(); wob(tray); api.hint(`Words need ${spec.minLen} letters or more. Add another letter.`); return; }
      if (P.key && !w.includes(P.key)) { sfx.soft(); wob(tray); api.hint(`Remember to use the ★ letter ${P.key} in every word.`); return; }
      if (found.includes(w)) { sfx.soft(); wob(tray); api.hint(`You already have ${w}. Try a different word.`); return; }
      if (isWordLoose(w)) {
        found.push(w); busy = true;
        paint('good'); tray.classList.add('w3-win');
        happyRun(Math.min(3 + found.length, 8), 440 + w.length * 30);
        foundEl.append(el('span', 'wb-chip', w));
        api.rounds(N, found.length);
        if (found.length >= N) {
          api.hint(`${w}! You found ${N} words. ${cheer()}`);
          api.later(() => api.done(starsFor(Math.floor(mistakes / 2) + helps, 1, 3)), 1200);
          return;
        }
        api.hint(`${w}! ${cheer()} ${N - found.length} more to find.`);
        if (w.length >= 6) toast(cheer());
        api.later(() => { cur = []; busy = false; paint(); }, 750);
      } else {
        mistakes++; busy = true; sfx.soft(); paint('bad'); wob(tray);
        api.hint(`${w} isn’t in my word list. Try another one.`);
        api.later(() => { cur = []; busy = false; paint(); }, 1000);
      }
    }
    buildTiles(); paint(); baseHint();
  }

  /* =========================================================
     TIMES TABLES
     ========================================================= */
  const TT_THINGS = [
    { e: '🍎', one: 'apple', many: 'apples', box: 'bag', boxes: 'bags' },
    { e: '🥚', one: 'egg', many: 'eggs', box: 'box', boxes: 'boxes' },
    { e: '🧁', one: 'cake', many: 'cakes', box: 'plate', boxes: 'plates' },
    { e: '🌷', one: 'flower', many: 'flowers', box: 'pot', boxes: 'pots' },
    { e: '🍪', one: 'biscuit', many: 'biscuits', box: 'tin', boxes: 'tins' },
    { e: '🍓', one: 'strawberry', many: 'strawberries', box: 'punnet', boxes: 'punnets' },
    { e: '⭐', one: 'star', many: 'stars', box: 'card', boxes: 'cards' }
  ];
  function timesSpec(L) {
    const T = [[1, 2, 5, 10], [2, 5, 10], [2, 3, 4, 5, 10], [2, 3, 4, 5, 10, 11], [3, 4, 6, 11], [3, 4, 6, 7, 8], [6, 7, 8, 9, 12]];
    const tables = L <= 7 ? T[L - 1] : [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const maxMul = [5, 6, 6, 8, 10, 12, 12][Math.min(L, 7) - 1];
    return { tables, maxMul, pics: L <= 3 ? 'all' : L <= 5 ? 'some' : 'none', nOpts: L <= 2 ? 3 : 4 };
  }
  function ttChoices(g, k, nOpts) {
    const p = g * k, c = new Set();
    [(g + 1) * k, (g - 1) * k, g * (k + 1), g * (k - 1), p + 1, p - 1, p + 2, p - 2, p + 10, p - 10].forEach(x => { if (x > 0 && x !== p) c.add(x); });
    const near = shuffle([...c].slice(0, 4)), far = shuffle([...c].slice(4));
    const out = [p, ...near.concat(far).slice(0, nOpts - 1)];
    for (let x = p + 3; out.length < nOpts; x++) if (!out.includes(x)) out.push(x);
    return out.sort((a, b) => a - b);
  }
  const ITEM_COLS = { 1: 1, 2: 2, 3: 3, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 3, 10: 5, 11: 4, 12: 4 };
  function startTimes(L, api) {
    L = lvl(L);
    const spec = timesSpec(L), total = 5;
    // build distinct questions: k = the table (items in each group), g = how many groups
    const qs = [], seen = new Set();
    for (let t = 0; qs.length < total && t < 400; t++) {
      const k = pick(spec.tables), g = 1 + randInt(spec.maxMul);
      if (L <= 2 && g === 1 && t < 200) continue;
      const id = Math.min(g, k) + 'x' + Math.max(g, k);
      if (seen.has(id)) continue; seen.add(id); qs.push({ g, k });
    }
    let round = 0, mistakes = 0;
    function play() {
      api.rounds(total, round); api.stage.innerHTML = '';
      const { g, k } = qs[round], p = g * k, th = TT_THINGS[(round + randInt(TT_THINGS.length)) % TT_THINGS.length];
      api.stage.dataset.ans = String(p);
      const mode = spec.pics === 'all' ? (p <= 30 && g <= 6 ? 'items' : g <= 6 ? 'lab' : 'none')
        : spec.pics === 'some' ? (p <= 24 && g <= 6 ? 'items' : g <= 5 ? 'lab' : 'none') : 'none';
      const say = `${g} ${g === 1 ? th.box : th.boxes} of ${k} ${k === 1 ? th.one : th.many}`;
      const wrap = el('div', 'tt-wrap'), card = el('div', 'tt-card');
      if (mode !== 'none') {
        const gr = el('div', 'tt-groups');
        for (let i = 0; i < g; i++) {
          const cu = CUBES[i % CUBES.length];
          const b = el('div', 'tt-bag c-' + cu.c + (mode === 'lab' ? ' lab' : ''));
          b.style.animationDelay = (i * .08) + 's';
          if (mode === 'items') { b.style.setProperty('--k', ITEM_COLS[k] || 4); b.innerHTML = Array(k).fill(`<span>${th.e}</span>`).join(''); }
          else b.innerHTML = `<b>${k}</b><span>${th.e}</span>`;
          b.insertAdjacentHTML('beforeend', `<span class="tt-sym" aria-hidden="true">${cu.s}</span>`);
          gr.append(b);
        }
        card.append(gr);
      }
      const eq = el('div', 'tt-eq', `${g} × ${k} = <span class="q">?</span>`);
      card.append(eq, el('div', 'tt-say', mode === 'none' ? `That’s ${say}.` : say));
      const opts = el('div', 'tt-opts'), ch = ttChoices(g, k, spec.nOpts);
      opts.style.setProperty('--n', ch.length);
      let solved = false, wrongHere = 0;
      ch.forEach(v => {
        const b = el('button', 'btn c-card tt-o', String(v)); b.type = 'button';
        b.onclick = () => {
          if (solved) return;
          if (v === p) {
            solved = true; b.classList.add('right'); sfx.good();
            const q = eq.querySelector('.q'); q.textContent = p; q.classList.add('ok');
            round++; api.rounds(total, round);
            api.hint(`${g} × ${k} = ${p}. ${cheer()}`);
            if (round === total) api.later(() => api.done(starsFor(mistakes, 1, 3)), 1300);
            else { toast(cheer()); api.later(play, 1700); }
          } else {
            mistakes++; wrongHere++; b.classList.add('nope'); sfx.soft(); wob(b);
            api.hint(mode === 'items' ? `Not ${v}. Count the ${th.many} in one ${th.box}, then count on for each ${th.box}.`
              : wrongHere === 1 ? `Not ${v}. Count up in ${k}s, ${g} time${g === 1 ? '' : 's'}.` : `Nearly. Count up in ${k}s: ${[...Array(Math.min(g, 3))].map((_, i) => k * (i + 1)).join(', ')}${g > 3 ? '…' : ''}`);
          }
        };
        opts.append(b);
      });
      wrap.append(card, opts); api.stage.append(wrap);
      api.hint(mode === 'items' ? `There are ${say}. How many ${th.many} altogether?` : `What is ${g} × ${k}? Pick the answer.`);
    }
    play();
  }

  /* =========================================================
     NUMBER LINE
     Values are whole "units" (unit = 1, ½ or 0.1) so all maths stays exact.
     ========================================================= */
  function nlSpec(L) {
    const S = {
      a: { unit: 1, min: 0, max: 10, tick: 1, lab: 1, snap: 1, tol: 0, hideLab: true, ord: 3, olo: 1, ohi: 10, gap: 1 },
      b: { unit: 1, min: 0, max: 10, tick: 1, lab: 5, snap: 1, tol: 0, ord: 4, olo: 1, ohi: 10, gap: 1 },
      c: { unit: 1, min: 0, max: 20, tick: 1, lab: 5, snap: 1, tol: 1, ord: 4, olo: 1, ohi: 20, gap: 2 },
      d: { unit: 1, min: 0, max: 50, tick: 5, lab: 10, snap: 1, tol: 2, ord: 5, olo: 1, ohi: 50, gap: 5 },
      e: { unit: 1, min: 0, max: 100, tick: 10, lab: 10, snap: 1, tol: 4, ord: 5, olo: 1, ohi: 99, gap: 10 },
      f: { unit: 1, min: 0, max: 100, tick: 10, lab: 50, snap: 1, tol: 4, ord: 5, olo: 1, ohi: 99, gap: 9 },
      h: { unit: .5, min: 0, max: 10, tick: 1, lab: 2, snap: 1, tol: 0, half: true, ord: 5, olo: 1, ohi: 9, gap: 1 },
      t: { unit: .1, min: 0, max: 10, tick: 1, lab: 5, snap: 1, tol: 0, ord: 5, olo: 1, ohi: 9, gap: 1 },
      H: { unit: .5, min: 0, max: 20, tick: 1, lab: 2, snap: 1, tol: 1, half: true, ord: 6, olo: 1, ohi: 19, gap: 2 },
      T: { unit: .1, min: 0, max: 20, tick: 1, lab: 5, snap: 1, tol: 1, ord: 6, olo: 1, ohi: 19, gap: 2 }
    };
    const k = L <= 8 ? 'abcdefht'[L - 1] : 'fHTe'[L % 4];
    return Object.assign({ key: k }, S[k]);
  }
  function nlFmt(u, s) {
    if (s.unit === 1) return String(u);
    if (s.unit === .5) { const w = Math.floor(u / 2); return u % 2 ? (w ? w + '½' : '½') : String(w); }
    return String(+(u / 10).toFixed(1));
  }
  const nlSay = (u, s) => s.unit === .5 && u % 2 ? nlFmt(u, s).replace('½', ' and a half').replace(/^ and a half$/, 'a half') : nlFmt(u, s);
  function nlTarget(s, avoid) {
    const c = [];
    for (let u = s.min + 1; u < s.max; u++) {
      if (avoid.includes(u)) continue;
      if (s.half && u % 2 === 0) continue;
      if (!s.hideLab && u % s.lab === 0) continue;
      c.push(u);
    }
    return pick(c);
  }
  function nlOrderSet(s) {
    for (let t = 0; t < 500; t++) {
      const v = [];
      for (let a = 0; a < 60 && v.length < s.ord; a++) {
        const u = s.olo + randInt(s.ohi - s.olo + 1);
        if (v.every(x => Math.abs(x - u) >= s.gap)) v.push(u);
      }
      if (v.length < s.ord) continue;
      if (s.half && v.filter(u => u % 2).length < 2) continue;
      return v;
    }
    const step = Math.max(s.gap, Math.floor((s.ohi - s.olo) / s.ord));
    return [...Array(s.ord)].map((_, i) => s.olo + i * step);
  }
  function makeLine(s, onTap) {
    const line = el('div', 'nl-line'), PAD = 5;
    const pct = u => PAD + (u - s.min) / (s.max - s.min) * (100 - 2 * PAD);
    line.append(el('div', 'nl-bar'));
    const labs = {};
    let labN = 0;
    for (let u = s.min; u <= s.max; u += s.tick) {
      const major = u % s.lab === 0 || (s.tick > 1 && u % s.tick === 0 && s.lab === s.tick);
      const t = el('div', 'nl-tick' + (u % s.lab === 0 ? ' maj' : '')); t.style.left = pct(u) + '%'; line.append(t);
      if (u % s.lab === 0) {
        const lowRow = (s.max - s.min) / s.lab > 6 && (labN++ % 2 === 1);
        const lb = el('div', 'nl-lab' + (lowRow ? ' low' : ''), nlFmt(u, s)); lb.style.left = pct(u) + '%'; line.append(lb); labs[u] = lb;
      }
      void major;
    }
    line.setAttribute('role', 'button'); line.setAttribute('aria-label', `Number line from ${nlFmt(s.min, s)} to ${nlFmt(s.max, s)}. Tap where the number goes.`);
    line.addEventListener('click', e => {
      if (!onTap) return;
      const r = line.getBoundingClientRect(); if (!r.width) return;
      const x = (e.clientX - r.left) / r.width * 100;
      let u = s.min + (x - PAD) / (100 - 2 * PAD) * (s.max - s.min);
      u = Math.round(u / s.snap) * s.snap; u = Math.max(s.min, Math.min(s.max, u));
      onTap(u);
    });
    function flag(u, cls, row) {
      const top = row ? 8 : 52, f = el('div', 'nl-flag tile ' + cls, nlFmt(u, s));
      f.style.left = pct(u) + '%'; f.style.top = top + 'px'; f.style.setProperty('--st', (106 - top - 42) + 'px');
      line.append(f); return f;
    }
    return { el: line, pct, flag, labs, PAD };
  }
  function startNumline(L, api) {
    L = lvl(L);
    const s = nlSpec(L), plan = ['place', 'place', 'order', 'place', 'order'], total = plan.length;
    let round = 0, mistakes = 0;
    const usedT = [];
    api.rounds(total, 0);
    function next() {
      round++; api.rounds(total, round);
      if (round === total) api.later(() => api.done(starsFor(mistakes, 1, 3)), 1300);
      else { toast(cheer()); api.later(play, 1700); }
    }
    function play() {
      api.stage.innerHTML = '';
      (plan[round] === 'place' ? playPlace : playOrder)();
    }
    function playPlace() {
      const t = nlTarget(s, usedT); usedT.push(t);
      api.stage.dataset.ans = JSON.stringify({ type: 'place', u: t, min: s.min, max: s.max, pad: 5 });
      let done = false, misses = 0, missFlag = null;
      const wrap = el('div', 'nl-wrap'), ask = el('div', 'nl-ask');
      ask.append(el('span', '', 'Where does'), el('span', 'tile', nlFmt(t, s)), el('span', '', 'go?'));
      const line = makeLine(s, u => {
        if (done) return;
        if (missFlag) { missFlag.remove(); missFlag = null; }
        const ok = Math.abs(u - t) <= s.tol;
        if (ok) {
          done = true; line.el.classList.add('off');
          line.flag(t, 'ok', 0); if (line.labs[t]) line.labs[t].classList.remove('gap');
          sfx.good(); api.hint(`${u === t ? 'Spot on!' : 'Close enough!'} ${nlFmt(t, s)} goes there.`);
          next();
        } else {
          mistakes += misses === 0 ? 1 : 0; misses++; sfx.soft();
          missFlag = line.flag(u, 'miss', 1);
          const f = missFlag; api.later(() => f.classList.add('fade'), 1600);
          api.hint(`That spot is ${nlFmt(u, s)}. ${nlFmt(t, s)} is ${t > u ? 'further right →' : '← further left'}.`);
        }
      });
      if (s.hideLab && line.labs[t]) line.labs[t].classList.add('gap');
      wrap.append(ask, line.el); api.stage.append(wrap);
      api.hint(`Tap the line where ${nlSay(t, s)} goes.`);
    }
    function playOrder() {
      const vals = nlOrderSet(s), sorted = vals.slice().sort((a, b) => a - b);
      api.stage.dataset.ans = JSON.stringify({ type: 'order', vals: sorted });
      let k = 0;
      const wrap = el('div', 'nl-wrap'), line = makeLine(s, null), poolEl = el('div', 'nl-pool');
      line.el.classList.add('off'); line.el.removeAttribute('role');
      shuffle(vals).forEach((u, i) => {
        const cu = CUBES[i % CUBES.length];
        const b = el('button', 'nl-card tile c-' + cu.c, nlFmt(u, s)); b.type = 'button'; b.dataset.v = u; b.style.animationDelay = (i * .06) + 's';
        b.onclick = () => {
          if (b.classList.contains('gone')) return;
          if (u === sorted[k]) {
            b.classList.add('gone'); line.flag(u, 'ok', k % 2); tone(440 * Math.pow(1.122, k), .16, 'triangle', .12); k++;
            if (k === sorted.length) { sfx.good(); api.hint(`${sorted.map(x => nlFmt(x, s)).join(', ')}. ${cheer()}`); next(); }
            else api.hint(`Yes! Now tap the next smallest number.`);
          } else { mistakes++; sfx.soft(); wob(b); api.hint(k ? 'Not that one yet. Find the smallest number that is left.' : 'Not that one yet. Find the smallest number.'); }
        };
        poolEl.append(b);
      });
      wrap.append(el('div', 'nl-ask', 'Smallest to biggest'), line.el, poolEl); api.stage.append(wrap);
      api.hint('Tap the numbers from smallest to biggest. They will land on the line.');
    }
    play();
  }

  R.w3 = { dict, makeBuilder, builderSpec, nlSpec, nlOrderSet, SAYINGS, scrambleRange, GUESS_PICS, guessLens, timesSpec, SEEDS }; // for testing
})();
