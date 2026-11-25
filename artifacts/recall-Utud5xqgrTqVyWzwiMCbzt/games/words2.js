/* Recall word games, batch 2: Word Ladder, Letter Dice, Anagram Wheel, Mini Crossword (all in "words") */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor, store } = R;
  const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  /* =========================================================
     SHARED WORD LISTS
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

  // Picture words: [word, emoji, short clue]. Used by Anagram Wheel and Mini Crossword.
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

  let DICT = null;
  function dict() {
    if (DICT) return DICT;
    DICT = new Set();
    DICT_SRC.forEach(s => s.trim().split(/\s+/).forEach(w => { w = w.toUpperCase(); if (/^[A-Z]+$/.test(w) && !BAD.has(w)) DICT.add(w); }));
    PICS.forEach(p => DICT.add(p[0]));
    return DICT;
  }
  // Lenient check used when the player makes a word: base words plus simple plurals.
  function isWordLoose(w) {
    const D = dict();
    if (BAD.has(w)) return false;
    if (D.has(w)) return true;
    if (w.length >= 4 && w.endsWith('S') && !w.endsWith('SS') && D.has(w.slice(0, -1))) return true;
    if (w.length >= 5 && w.endsWith('ES') && D.has(w.slice(0, -2))) return true;
    return false;
  }
  const ordinal = k => ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'][k] || (k + 1) + 'th';

  /* =========================================================
     STYLES
     ========================================================= */
  R.css(`
/* ---------- shared letter picker ---------- */
.w2-pick{display:grid; grid-template-columns:repeat(7, minmax(0, 1fr)); gap:7px; width:min(100%, 430px); margin:0 auto;
  padding:10px; border-radius:22px; background:rgba(0,0,0,.2); box-shadow:inset 0 3px 10px rgba(0,0,0,.25)}
.w2-key{height:54px; min-width:0; padding:0; font:700 1.6rem/1 var(--display); border-radius:14px; cursor:pointer;
  box-shadow:inset 0 -4px 0 rgba(0,0,0,.12), inset 0 2px 0 rgba(255,255,255,.5), 0 5px 0 var(--d, var(--card-edge)), 0 8px 12px rgba(0,0,0,.25)}
.w2-key.dim{opacity:.38}
.w2-key.go{animation:pop .25s}
.w2-key.wide{grid-column:span 2; font-size:1.3rem}
.w2-tools{display:flex; flex-wrap:wrap; justify-content:center; gap:12px}
.w2-tools .btn{min-height:58px; font-size:1.1rem; padding:.6em 1em}
.w2-tools .btn[disabled]{opacity:.4; pointer-events:none}
@keyframes w2-rise{0%{transform:translateY(0)} 40%{transform:translateY(-12px) scale(1.12)} 100%{transform:translateY(0)}}
.w2-win{animation:w2-rise .45s ease-out}

/* ---------- Word Ladder ---------- */
.wl-wrap{display:flex; flex-wrap:wrap; justify-content:center; align-items:flex-start; gap:14px 30px; max-width:960px; margin:0 auto}
.wl-ladder{display:flex; flex-direction:column; align-items:center; gap:7px; padding:12px 14px; border-radius:16px;
  border-left:12px solid var(--wood); border-right:12px solid var(--wood); background:repeating-linear-gradient(180deg, transparent 0 40px, rgba(0,0,0,.18) 40px 47px), rgba(0,0,0,.14);
  box-shadow:-4px 6px 0 var(--wood-d), 4px 6px 0 var(--wood-d)}
.wl-row{display:flex; align-items:center; gap:6px}
.wl-lab{width:30px; text-align:center; font-size:1.4rem; line-height:1}
.wl-t{width:42px; height:42px; font:700 1.5rem/1 var(--display); border-radius:12px; position:relative}
.wl-row.past .wl-t{--c:#E6F7EC; --d:#9CCFAE}
.wl-row.start .wl-t{--c:var(--sun); --d:var(--sun-d)}
.wl-row.goal .wl-t{--c:var(--sky); --d:var(--sky-d)}
.wl-row.ghost .wl-t{background:rgba(255,255,255,.12); box-shadow:inset 0 0 0 3px rgba(255,255,255,.25); color:rgba(255,255,255,.5)}
.wl-row.active .wl-t{width:62px; height:62px; font-size:2.2rem; border-radius:16px; cursor:pointer; padding:0; --c:var(--card); --d:var(--card-edge)}
.wl-row.active{margin:4px 0}
.wl-row.active .wl-t.match{--c:#C9F2D6; --d:var(--leaf-d)}
.wl-row.active .wl-t.match::after{content:'✓'; position:absolute; right:-5px; top:-7px; width:22px; height:22px; border-radius:50%; background:var(--leaf); color:#fff; font:700 .85rem/22px var(--body)}
.wl-row.active .wl-t.sel{--c:var(--coral); --d:var(--coral-d); color:#fff; transform:translateY(-5px); outline:4px solid #fff; outline-offset:2px}
.wl-row.new .wl-t{animation:bounceIn .3s}
.wl-row.won .wl-t{--c:var(--leaf); --d:var(--leaf-d); color:#fff}
.wl-row.hinted .wl-lab::before{content:'💡'}
.wl-side{display:flex; flex-direction:column; gap:14px; width:min(100%, 430px)}
.wl-goaltxt{text-align:center; font:600 1.25rem var(--display); color:var(--on-table)}
.wl-goaltxt b{letter-spacing:.08em; background:rgba(0,0,0,.22); padding:2px 10px; border-radius:10px}

/* ---------- Letter Dice ---------- */
.ld-wrap{display:flex; flex-direction:column; align-items:center; gap:14px; max-width:620px; margin:0 auto}
.ld-goal{font:600 1.25rem var(--display); color:var(--on-table); text-align:center}
.ld-trayrow{display:flex; align-items:center; justify-content:center; gap:10px; width:100%}
.ld-tray{flex:1 1 auto; max-width:440px; min-height:68px; display:flex; justify-content:center; align-items:center; gap:5px; padding:8px; border-radius:18px;
  background:rgba(0,0,0,.24); box-shadow:inset 0 4px 12px rgba(0,0,0,.3)}
.ld-tray .ld-l{width:42px; height:50px; font:700 1.7rem/1 var(--display); border-radius:12px; animation:bounceIn .2s}
.ld-tray .ld-ph{color:var(--on-table-soft); font:600 1.1rem var(--display)}
.ld-tray.good .ld-l{--c:var(--leaf); --d:var(--leaf-d); color:#fff}
.ld-btn{width:62px; height:62px; min-height:0; padding:0; font-size:1.7rem; flex:none}
.ld-dice{display:flex; flex-wrap:wrap; justify-content:center; gap:14px; max-width:440px; padding:6px; perspective:700px}
.ld-die{position:relative; width:66px; height:66px; padding:0; font:700 2.4rem/1 var(--display); border-radius:20%; cursor:pointer;
  background:radial-gradient(circle at 18% 18%, rgba(0,0,0,.18) 0 3.5px, transparent 4.5px), radial-gradient(circle at 82% 82%, rgba(0,0,0,.18) 0 3.5px, transparent 4.5px),
    linear-gradient(155deg, rgba(255,255,255,.45), rgba(255,255,255,0) 50%), var(--c)}
.ld-die.used{transform:translateY(5px) scale(.88); filter:saturate(.35) brightness(.92); opacity:.55}
.ld-die .ld-n{position:absolute; top:-9px; right:-9px; width:26px; height:26px; border-radius:50%; background:var(--ink); color:#fff; font:700 .95rem/26px var(--body)}
.ld-die.rolling{animation:ld-roll .95s cubic-bezier(.25,.8,.35,1) both; animation-delay:var(--dl, 0s)}
.ld-die.blank{color:transparent}
.ld-die.glow{animation:ld-glow .5s}
@keyframes ld-roll{0%{transform:translateY(-140px) rotateX(400deg) rotateZ(-160deg) scale(.6); opacity:0}
  15%{opacity:1} 55%{transform:translateY(10px) rotateX(-20deg) rotateZ(14deg) scale(1.05)} 75%{transform:translateY(-10px) rotateZ(-6deg)} 100%{transform:none}}
@keyframes ld-glow{50%{transform:translateY(-10px) scale(1.15)}}
.ld-roll{font-size:1.5rem; min-height:72px; padding:.6em 1.6em}
.ld-found{display:flex; flex-wrap:wrap; justify-content:center; gap:8px; max-width:560px; min-height:44px}
.ld-chip{padding:7px 14px; border-radius:14px; background:var(--leaf); color:#fff; font:700 1.2rem/1.1 var(--display); letter-spacing:.05em;
  box-shadow:0 4px 0 var(--leaf-d); animation:bounceIn .3s}
.ld-chip::before{content:'✓ '}

/* ---------- Anagram Wheel ---------- */
.aw-wrap{display:flex; flex-direction:column; align-items:center; gap:16px; max-width:620px; margin:0 auto}
.aw-slots{display:grid; grid-template-columns:repeat(var(--n), minmax(0, 56px)); gap:7px; width:min(100%, calc(var(--n) * 63px))}
.aw-slot{aspect-ratio:1; min-width:0; padding:0; font:700 2rem/1 var(--display); border-radius:14px; cursor:pointer; position:relative}
.aw-slot.empty{background:rgba(255,255,255,.14); box-shadow:inset 0 0 0 3px rgba(255,255,255,.35), inset 0 -4px 0 rgba(0,0,0,.12)}
.aw-slot.empty::after{content:''; position:absolute; left:25%; right:25%; bottom:18%; height:4px; border-radius:2px; background:rgba(255,255,255,.5)}
.aw-slot.fill{--c:var(--sun); --d:var(--sun-d); animation:bounceIn .2s}
.aw-slot.given{--c:var(--peach); --d:var(--peach-d)}
.aw-slot.right{--c:var(--leaf); --d:var(--leaf-d); color:#fff}
.aw-wheel{position:relative; width:270px; height:270px; border-radius:50%;
  background:radial-gradient(circle, rgba(255,255,255,.1) 0 40%, rgba(0,0,0,.2) 41% 100%); box-shadow:inset 0 5px 16px rgba(0,0,0,.35), 0 0 0 8px rgba(255,255,255,.1)}
.aw-wheel.spin{animation:aw-spin .6s ease-in-out}
@keyframes aw-spin{to{rotate:360deg}}
.aw-pic{position:absolute; left:50%; top:50%; width:104px; height:104px; margin:-52px 0 0 -52px; border-radius:50%; font-size:64px; line-height:1;
  display:grid; place-items:center}
.aw-pic span{filter:drop-shadow(0 4px 3px rgba(0,0,0,.25))}
.aw-l{position:absolute; left:50%; top:50%; width:60px; height:60px; margin:-30px 0 0 -30px; padding:0; font:700 2.1rem/1 var(--display); border-radius:50%; cursor:pointer;
  transform:rotate(var(--a)) translateY(-100px) rotate(calc(var(--a) * -1)); transition:opacity .2s, transform .3s}
.aw-l.used{opacity:.2; pointer-events:none}
.aw-l.pop{animation:pop .3s}

/* ---------- Mini Crossword ---------- */
.cw-wrap{display:flex; flex-wrap:wrap; justify-content:center; align-items:flex-start; gap:14px 28px; max-width:960px; margin:0 auto}
.cw-main{display:flex; flex-direction:column; align-items:center; gap:12px; width:min(100%, 400px)}
.cw-clue{display:flex; align-items:center; gap:12px; width:100%; min-height:74px; padding:8px 14px; border-radius:18px; background:var(--card); color:var(--ink);
  box-shadow:0 5px 0 var(--card-edge), 0 10px 18px rgba(0,0,0,.22)}
.cw-clue .cw-em{font-size:46px; line-height:1; flex:none}
.cw-clue .cw-ct{flex:1; font:600 1.2rem/1.2 var(--display)}
.cw-clue .btn{flex:none; min-height:56px; padding:.4em .7em; font-size:1rem}
.cw-clue .cw-cn{display:block; font:700 .95rem var(--body); color:var(--ink-soft)}
.cw-clue.solved{background:var(--good-bg)}
.cw-grid{display:grid; grid-template-columns:repeat(var(--n), 1fr); gap:5px; width:min(100%, calc(var(--n) * 64px)); padding:8px; border-radius:18px; background:var(--ink);
  box-shadow:0 6px 0 #000, 0 12px 22px rgba(0,0,0,.3)}
.cw-cell{position:relative; aspect-ratio:1; min-width:0; padding:0; border:0; border-radius:9px; background:var(--card); color:var(--ink); cursor:pointer;
  display:grid; place-items:center; font:700 calc(min(100vw - 60px, var(--n) * 64px) / var(--n) * .5)/1 var(--display); box-shadow:inset 0 -4px 0 rgba(0,0,0,.1)}
.cw-cell.blk{background:transparent; box-shadow:none; cursor:default}
.cw-cell .cw-num{position:absolute; left:4px; top:2px; font:700 .8rem/1 var(--body); color:var(--ink-soft)}
.cw-cell.word{background:#FFE7A8}
.cw-cell.sel{background:var(--sun); box-shadow:inset 0 0 0 3px var(--sun-d)}
.cw-cell.ok{background:#BDEFCB; color:#145C2E}
.cw-cell.ok.sel{box-shadow:inset 0 0 0 3px var(--leaf-d)}
.cw-cell.flash{animation:pop .35s}
.cw-cell.given{color:var(--coral-d)}
.cw-chips{display:flex; flex-wrap:wrap; justify-content:center; gap:8px}
.cw-chips{gap:6px}
.cw-chip{position:relative; width:52px; height:52px; padding:0; border:0; border-radius:14px; cursor:pointer; background:rgba(0,0,0,.22); color:#fff; display:grid; place-items:center}
.cw-chip .e{font-size:1.6rem; line-height:1}
.cw-chip .k{position:absolute; left:-4px; top:-6px; min-width:26px; height:22px; padding:0 4px; border-radius:11px; background:var(--card); color:var(--ink); font:700 .8rem/22px var(--body)}
.cw-chip.on{outline:3px solid #fff}
.cw-chip.done{background:var(--leaf)}
.cw-side{display:flex; flex-direction:column; gap:14px; width:min(100%, 430px)}
@media (max-width:520px){ .w2-key{height:50px; font-size:1.45rem} .w2-pick{gap:6px; padding:8px} .aw-wheel{width:250px; height:250px} .aw-l{transform:rotate(var(--a)) translateY(-92px) rotate(calc(var(--a) * -1))} }
`);

  register({ id: 'ladder', cat: 'words', order: 6, name: 'Word Ladder', icon: '🪜', desc: 'Change one letter at a time to reach a word', gentle: false, start: startLadder });
  register({ id: 'dice', cat: 'words', order: 7, name: 'Letter Dice', icon: '🎲', desc: 'Roll the letter dice and make words', gentle: true, start: startDice });
  register({ id: 'anagram', cat: 'words', order: 8, name: 'Anagram Wheel', icon: '🎡', desc: 'Unscramble the letters to name the picture', gentle: true, start: startAnagram });
  register({ id: 'crossword', cat: 'words', order: 9, name: 'Mini Crossword', icon: '✏️', desc: 'Fill a little crossword with picture clues', gentle: false, start: startCrossword });

  /* ---------- shared A–Z picker ---------- */
  function makePicker(onPick, extra) {
    const box = el('div', 'w2-pick'), keys = {};
    for (const ch of AZ) {
      const b = el('button', 'w2-key tile c-card press', ch); b.type = 'button'; b.dataset.k = ch; b.setAttribute('aria-label', 'Letter ' + ch);
      b.onclick = () => { b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); onPick(ch); };
      keys[ch] = b; box.append(b);
    }
    (extra || []).forEach(x => { const b = el('button', 'w2-key tile press wide ' + (x.cls || 'c-peach'), x.label); b.type = 'button'; b.setAttribute('aria-label', x.aria || x.label); b.onclick = x.fn; box.append(b); });
    return {
      el: box, keys,
      dim(ok) { for (const ch of AZ) keys[ch].classList.toggle('dim', !!ok && !ok.has(ch)); }
    };
  }
  function btn(label, cls, fn) { const b = el('button', 'btn ' + cls, label); b.type = 'button'; b.onclick = fn; return b; }
  function happyRun(n, base) { for (let k = 0; k < n; k++) tone(base * Math.pow(1.122, k), .12, 'triangle', .09, k * .07); }

  /* =========================================================
     WORD LADDER
     ========================================================= */
  const LADDER_G = {};
  function ladderGraph(len) {
    if (LADDER_G[len]) return LADDER_G[len];
    const words = [...dict()].filter(w => w.length === len);
    const buckets = new Map();
    words.forEach(w => { for (let i = 0; i < len; i++) { const k = w.slice(0, i) + '_' + w.slice(i + 1) + i; if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(w); } });
    const nb = new Map();
    words.forEach(w => {
      const s = new Set();
      for (let i = 0; i < len; i++) buckets.get(w.slice(0, i) + '_' + w.slice(i + 1) + i).forEach(x => { if (x !== w) s.add(x); });
      nb.set(w, [...s]);
    });
    return (LADDER_G[len] = { words, nb });
  }
  function bfs(G, src) {
    const dist = new Map([[src, 0]]), q = [src];
    for (let h = 0; h < q.length; h++) { const w = q[h], d = dist.get(w); for (const x of G.nb.get(w)) if (!dist.has(x)) { dist.set(x, d + 1); q.push(x); } }
    return dist;
  }
  function makeLadder(len, d) {
    const G = ladderGraph(len);
    const starts = G.words.filter(w => G.nb.get(w).length >= 2);
    for (let want = d; want >= 1; want--) {
      for (let a = 0; a < 80; a++) {
        const s = pick(starts), dist = bfs(G, s);
        const cands = [...dist.keys()].filter(w => dist.get(w) === want && G.nb.get(w).length >= 1);
        if (cands.length) return { len, start: s, goal: pick(cands), steps: want };
      }
    }
    return null;
  }
  function ladderSpec(L) {
    if (L <= 1) return { len: 3, d: 2 };
    if (L === 2) return { len: 3, d: 3 };
    if (L === 3) return { len: 4, d: 3 };
    if (L === 4) return { len: 4, d: 4 };
    if (L === 5) return { len: Math.random() < .5 ? 3 : 4, d: 4 };
    if (L <= 7) return { len: 4, d: 5 };
    return { len: Math.random() < .25 ? 3 : 4, d: pick([4, 5, 5, 6, 6]) };
  }
  R.w2 = { dict, ladderGraph, bfs, makeLadder, ladderSpec }; // exposed for testing

  function startLadder(L, api) {
    L = Math.max(1, Math.floor(L) || 1);
    const spec0 = ladderSpec(L);
    const total = spec0.d <= 3 ? 2 : 1;
    let round = 0, mistakes = 0, hints = 0;
    const easy = L <= 2;
    api.rounds(total, 0);

    function play(spec) {
      api.stage.innerHTML = '';
      const P = makeLadder(spec.len, spec.d);
      const G = ladderGraph(P.len), toGoal = bfs(G, P.goal);
      let path = [P.start], sel = null, busy = false, hinted = new Set(), fresh = false;

      const wrap = el('div', 'wl-wrap');
      const lad = el('div', 'wl-ladder');
      const side = el('div', 'wl-side');
      const pk = makePicker(onLetter);
      const undoBtn = btn('↶ Undo', 'c-card', undo);
      const hintBtn = btn('💡 Next word', 'c-sun', giveHint);
      const tools = el('div', 'w2-tools'); tools.append(undoBtn, hintBtn);
      side.append(pk.el, tools);
      wrap.append(lad, side); api.stage.append(wrap);

      const cur = () => path[path.length - 1];
      function row(w, cls, lab) {
        const r = el('div', 'wl-row ' + cls); r.append(el('span', 'wl-lab', lab || ''));
        [...w].forEach(ch => r.append(el('span', 'wl-t tile', ch))); return r;
      }
      function render() {
        lad.innerHTML = '';
        const c = cur(), won = c === P.goal;
        path.forEach((w, k) => {
          if (k === path.length - 1) {
            const r = el('div', 'wl-row active' + (fresh ? ' new' : '') + (hinted.has(k) ? ' hinted' : ''));
            r.append(el('span', 'wl-lab', hinted.has(k) ? '' : k === 0 ? '🚩' : won ? '🏁' : '👉'));
            [...w].forEach((ch, i) => {
              const b = el('button', 'wl-t tile' + (!won && ch === P.goal[i] ? ' match' : '') + (sel === i ? ' sel' : ''), ch); b.type = 'button';
              b.setAttribute('aria-label', `${ordinal(i)} letter, ${ch}`);
              b.onclick = () => tapTile(i); r.append(b);
            });
            if (won) r.classList.add('won');
            lad.append(r);
          } else lad.append(row(w, (k === 0 ? 'start' : 'past') + (hinted.has(k) ? ' hinted' : ''), k === 0 ? '🚩' : ''));
        });
        if (!won) {
          const left = toGoal.get(c);
          for (let g = 0; g < left - 1; g++) lad.append(row('?'.repeat(P.len), 'ghost'));
          lad.append(row(P.goal, 'goal', '🏁'));
        }
        fresh = false;
        undoBtn.disabled = path.length < 2 || won;
        if (easy && sel !== null && !won) {
          const ok = new Set(); for (const ch of AZ) { const w = c.slice(0, sel) + ch + c.slice(sel + 1); if (w !== c && G.nb.get(c).includes(w)) ok.add(ch); }
          pk.dim(ok);
        } else pk.dim(null);
      }
      function baseHint() {
        const left = toGoal.get(cur());
        api.hint(`Change ${cur()} into ${P.goal}. Tap a letter to change it.` + (left <= 1 ? ' One more step!' : ''));
      }
      function tapTile(i) {
        if (busy || cur() === P.goal) return;
        sfx.tap();
        sel = sel === i ? null : i; render();
        if (sel !== null) api.hint(`Now pick a new ${ordinal(i)} letter from the letters below.`); else baseHint();
      }
      function onLetter(ch) {
        if (busy || cur() === P.goal) return;
        if (sel === null) { api.hint('First tap the letter in the word you want to change.'); wob(lad.querySelector('.wl-row.active')); sfx.soft(); return; }
        const c = cur();
        if (c[sel] === ch) { api.hint(`That letter is already ${ch}. Pick a different one.`); return; }
        const w = c.slice(0, sel) + ch + c.slice(sel + 1);
        if (!G.nb.get(c).includes(w)) {
          mistakes++; sfx.soft(); wob(lad.querySelector('.wl-row.active'));
          api.hint(`${w} isn’t in my word list. Try another letter.`);
          return;
        }
        step(w, false);
      }
      function step(w, viaHint) {
        sel = null;
        const back = path.indexOf(w);
        if (back >= 0) { path = path.slice(0, back + 1); [...hinted].forEach(k => { if (k > back) hinted.delete(k); }); }
        else { path.push(w); if (viaHint) hinted.add(path.length - 1); }
        fresh = true;
        const n = path.length;
        tone(380 + n * 45, .12, 'triangle', .1); tone(570 + n * 60, .12, 'sine', .07, .07);
        render();
        if (w === P.goal) return win();
        baseHint();
      }
      function undo() {
        if (busy || path.length < 2) return;
        hinted.delete(path.length - 1); path.pop(); sel = null; sfx.tap(); render(); baseHint();
      }
      function giveHint() {
        if (busy || cur() === P.goal) return;
        const c = cur(), d = toGoal.get(c);
        const next = G.nb.get(c).filter(x => toGoal.get(x) === d - 1);
        hints++; sfx.tap();
        const w = pick(next);
        api.hint(`Try ${w}.`);
        step(w, true);
      }
      function win() {
        busy = true; round++; api.rounds(total, round);
        pk.dim(new Set()); hintBtn.disabled = true; undoBtn.disabled = true;
        const rows = [...lad.querySelectorAll('.wl-row')];
        rows.forEach((r, k) => api.later(() => { r.classList.add('won', 'w2-win'); tone(440 * Math.pow(1.122, k), .14, 'triangle', .1); }, k * 120));
        api.hint(`You climbed from ${P.start} to ${P.goal}!`);
        api.later(() => { sfx.good(); toast(cheer()); }, rows.length * 120);
        if (round >= total) api.done(starsFor(hints + Math.floor(mistakes / 2), 0, 2));
        else api.later(() => play(ladderSpec(L)), rows.length * 120 + 1300);
      }
      render(); baseHint();
    }
    play(spec0);
  }

  /* =========================================================
     LETTER DICE
     ========================================================= */
  const VOWEL_DICE = ['AAEIOU', 'AEEIOU', 'AEIOUE', 'AAEEIO', 'EEIOUA', 'AEIOOU'];
  const CONS_DICE = ['RSTLNM', 'TRSNDL', 'BCDGHP', 'MNRSTL', 'CDHLPR', 'FGKLMN', 'BDPSTW', 'HNRSTY', 'CKLMPS', 'GHRSTW', 'BLNRST', 'DGMPRT', 'CFHLRS', 'NRSTVY'];
  const DICE_COLS = ['c-sun', 'c-sky', 'c-leaf', 'c-berry', 'c-orange', 'c-grape', 'c-coral', 'c-peach', 'c-sun'];
  function counts(s) { const m = {}; for (const ch of s) m[ch] = (m[ch] || 0) + 1; return m; }
  function canMake(w, have) { const m = {}; for (const ch of w) { m[ch] = (m[ch] || 0) + 1; if (m[ch] > (have[ch] || 0)) return false; } return true; }
  function diceSpec(L) {
    const t = [[5, 3], [6, 4], [6, 5], [7, 5], [7, 6], [8, 6], [8, 7]];
    if (L <= t.length) return { k: t[L - 1][0], n: t[L - 1][1] };
    return pick([{ k: 8, n: 7 }, { k: 9, n: 7 }, { k: 9, n: 8 }]);
  }
  function rollDice(k, need) {
    const words = [...dict()];
    let best = null;
    for (let a = 0; a < 400; a++) {
      const nv = Math.max(2, Math.round(k * .4));
      const faces = shuffle(VOWEL_DICE.slice()).slice(0, nv).concat(shuffle(CONS_DICE.slice()).slice(0, k - nv));
      const letters = faces.map(f => pick(f));
      const have = counts(letters.join(''));
      const found = words.filter(w => w.length >= 3 && w.length <= k && canMake(w, have));
      const ok = found.length >= need + 3 && found.some(w => w.length >= 4);
      if (!best || found.length > best.found.length) best = { letters: shuffle(letters), found };
      if (ok) return { letters: shuffle(letters), found };
    }
    return best;
  }
  R.w2.rollDice = rollDice; R.w2.diceSpec = diceSpec; R.w2.isWordLoose = isWordLoose;

  function startDice(L, api) {
    L = Math.max(1, Math.floor(L) || 1);
    const { k, n } = diceSpec(L);
    const D = rollDice(k, n);
    const found = [];
    let order = [], rolled = false, busy = false, mistakes = 0, hints = 0, finished = false, combo = 0;
    api.rounds(n, 0);
    api.hint(`Tap “Roll the dice” to throw ${k} letter dice.`);

    const wrap = el('div', 'ld-wrap');
    const goal = el('div', 'ld-goal', `Make ${n} words of 3 letters or more`);
    const trayRow = el('div', 'ld-trayrow');
    const backBtn = btn('⌫', 'c-card ld-btn', back); backBtn.setAttribute('aria-label', 'Take back a letter');
    const tray = el('div', 'ld-tray');
    const okBtn = btn('✓', 'c-leaf ld-btn', submit); okBtn.setAttribute('aria-label', 'Add this word');
    trayRow.append(backBtn, tray, okBtn);
    const diceBox = el('div', 'ld-dice');
    const dice = D.letters.map((ch, i) => {
      const b = el('button', 'ld-die tile blank ' + DICE_COLS[i % DICE_COLS.length], '?'); b.type = 'button'; b.dataset.i = i;
      b.onclick = () => tapDie(i); diceBox.append(b); return b;
    });
    const rollBtn = btn('🎲 Roll the dice', 'c-coral ld-roll', roll);
    const tools = el('div', 'w2-tools');
    const shufBtn = btn('🔀 Shuffle', 'c-card', shuffleDice);
    const showBtn = btn('💡 Show me a word', 'c-sun', showWord);
    tools.append(shufBtn, showBtn); tools.hidden = true; trayRow.hidden = true;
    const foundBox = el('div', 'ld-found');
    wrap.append(goal, trayRow, diceBox, rollBtn, tools, foundBox);
    api.stage.append(wrap);

    function roll() {
      if (rolled) return;
      rolled = true; busy = true; rollBtn.hidden = true;
      dice.forEach((d, i) => { d.style.setProperty('--dl', (i * .06) + 's'); d.classList.remove('blank'); d.classList.add('rolling'); });
      let t = 0;
      const flick = () => {
        t++;
        dice.forEach((d, i) => { if (t < 9 + i) d.textContent = pick(AZ); else d.textContent = D.letters[i]; });
        tone(200 + randInt(200), .04, 'square', .03);
        if (t < 9 + dice.length) api.later(flick, 75); else land();
      };
      flick();
    }
    function land() {
      dice.forEach((d, i) => { d.textContent = D.letters[i]; d.setAttribute('aria-label', 'Letter die ' + D.letters[i]); tone(150, .08, 'triangle', .08, i * .04); });
      busy = false; api.later(() => dice.forEach(d => d.classList.remove('rolling')), 1000 + dice.length * 60);
      trayRow.hidden = false; tools.hidden = false;
      paintTray(); baseHint();
    }
    function baseHint() { api.hint(`Tap dice in order to spell a word, then tap ✓. ${n - found.length} more to make.`); }
    function word() { return order.map(i => D.letters[i]).join(''); }
    function paintTray(good) {
      tray.innerHTML = ''; tray.classList.toggle('good', !!good);
      if (!order.length) tray.append(el('span', 'ld-ph', 'Tap the dice'));
      order.forEach(i => tray.append(el('span', 'ld-l tile c-card', D.letters[i])));
      dice.forEach((d, i) => {
        const p = order.indexOf(i);
        d.classList.toggle('used', p >= 0);
        const old = d.querySelector('.ld-n'); if (old) old.remove();
        if (p >= 0) d.append(el('span', 'ld-n', String(p + 1)));
      });
      okBtn.disabled = order.length < 3; backBtn.disabled = !order.length;
    }
    function tapDie(i) {
      if (!rolled || busy || finished) return;
      const p = order.indexOf(i);
      if (p >= 0) { order = order.slice(0, p); sfx.tap(); }
      else { order.push(i); tone(420 + order.length * 50, .08, 'triangle', .09); }
      paintTray();
    }
    function back() { if (busy || !order.length) return; order.pop(); sfx.tap(); paintTray(); }
    function submit() {
      if (busy || finished) return;
      const w = word();
      if (w.length < 3) { api.hint('Words need 3 letters or more.'); return; }
      if (found.includes(w)) { api.hint(`You have ${w} already. Try a different word.`); order = []; paintTray(); return; }
      if (!isWordLoose(w)) {
        mistakes++; combo = 0; sfx.soft(); wob(tray);
        api.hint(`${w} isn’t in my word list. Try another.`);
        busy = true; api.later(() => { busy = false; order = []; paintTray(); }, 700);
        return;
      }
      found.push(w); combo++;
      const chip = el('span', 'ld-chip', w); foundBox.append(chip);
      paintTray(true); busy = true;
      happyRun(w.length, 440 + combo * 30);
      api.rounds(n, found.length);
      if (w.length >= 5) toast(cheer() + ' A long one!'); else if (combo >= 3) toast(cheer());
      if (found.length >= n) {
        finished = true; shufBtn.disabled = showBtn.disabled = okBtn.disabled = backBtn.disabled = true;
        api.hint(`You made ${n} words!`);
        api.later(() => { sfx.good(); dice.forEach((d, i) => api.later(() => { d.classList.remove('glow'); void d.offsetWidth; d.classList.add('glow'); }, i * 70)); }, 300);
        api.done(starsFor(hints + Math.floor(mistakes / 3), 0, 2));
        return;
      }
      api.later(() => { busy = false; order = []; paintTray(); baseHint(); }, 650);
    }
    function shuffleDice() {
      if (!rolled || busy) return;
      sfx.tap();
      const idx = shuffle(dice.map((_, i) => i));
      idx.forEach(i => { diceBox.append(dice[i]); dice[i].classList.remove('glow'); void dice[i].offsetWidth; dice[i].classList.add('glow'); });
    }
    function showWord() {
      if (!rolled || busy || finished) return;
      const left = D.found.filter(w => !found.includes(w) && !found.includes(w + 'S'));
      if (!left.length) return;
      const shortest = Math.min(...left.map(w => w.length));
      const w = pick(left.filter(x => x.length <= Math.max(shortest, 4)));
      hints++; busy = true; order = []; paintTray();
      const used = new Set();
      [...w].forEach((ch, j) => {
        const i = D.letters.findIndex((c, q) => c === ch && !used.has(q)); used.add(i);
        api.later(() => {
          order.push(i); paintTray(); tone(420 + order.length * 50, .1, 'triangle', .09);
          dice[i].classList.remove('glow'); void dice[i].offsetWidth; dice[i].classList.add('glow');
          if (j === w.length - 1) { busy = false; api.hint(`Here’s one: ${w}. Tap ✓ to add it.`); }
        }, 200 + j * 380);
      });
      api.hint('Watch the dice…');
    }
  }

  /* =========================================================
     ANAGRAM WHEEL
     ========================================================= */
  function anagramLens(L) {
    if (L <= 1) return [3];
    if (L === 2) return [3, 4];
    if (L === 3) return [4];
    if (L === 4) return [4, 5];
    if (L === 5) return [5];
    if (L <= 7) return [5, 6];
    return [5, 6, 6, 7];
  }
  function scramble(w) {
    const D = dict();
    for (let a = 0; a < 60; a++) { const s = shuffle([...w]).join(''); if (s !== w && (a > 40 || !D.has(s))) return [...s]; }
    return [...w].reverse();
  }
  R.w2.anagramLens = anagramLens; R.w2.PICS = PICS;

  function startAnagram(L, api) {
    L = Math.max(1, Math.floor(L) || 1);
    const total = L <= 1 ? 4 : 5;
    const lens = anagramLens(L);
    const recent = store.get('aw-recent', []);
    let pool = shuffle(PICS.filter(p => lens.includes(p[0].length) && !recent.includes(p[0])));
    if (pool.length < total) pool = shuffle(PICS.filter(p => lens.includes(p[0].length)));
    // spread lengths across the rounds, short ones first
    const picks = [];
    for (let i = 0; i < total; i++) {
      const want = lens[Math.min(lens.length - 1, Math.floor(i * lens.length / total))];
      const j = pool.findIndex(p => p[0].length === want && !picks.includes(p));
      picks.push(j >= 0 ? pool[j] : pool.find(p => !picks.includes(p)));
    }
    store.set('aw-recent', picks.map(p => p[0]).concat(recent).slice(0, 30));
    let round = 0, mistakes = 0, hints = 0;
    api.rounds(total, 0);

    function play() {
      api.stage.innerHTML = '';
      const [word, emoji, clue] = picks[round], n = word.length;
      let letters = scramble(word);
      const slots = Array(n).fill(null); // index into letters
      const given = new Set();
      let busy = false, lastWrong = '';

      const wrap = el('div', 'aw-wrap');
      const slotBox = el('div', 'aw-slots'); slotBox.style.setProperty('--n', n);
      const slotEls = slots.map((_, k) => { const b = el('button', 'aw-slot tile empty'); b.type = 'button'; b.onclick = () => tapSlot(k); slotBox.append(b); return b; });
      const wheel = el('div', 'aw-wheel');
      const picEl = el('div', 'aw-pic tile c-card', `<span>${emoji}</span>`); picEl.setAttribute('aria-label', 'Picture clue: ' + clue);
      wheel.append(picEl);
      let lEls = [];
      function buildWheel() {
        lEls.forEach(e => e.remove());
        lEls = letters.map((ch, i) => {
          const b = el('button', 'aw-l tile ' + ['c-sun', 'c-sky', 'c-berry', 'c-leaf', 'c-orange', 'c-grape', 'c-coral'][i % 7], ch); b.type = 'button';
          b.style.setProperty('--a', (360 * i / n) + 'deg'); b.setAttribute('aria-label', 'Letter ' + ch);
          b.onclick = () => tapLetter(i); wheel.append(b); return b;
        });
      }
      buildWheel();
      const tools = el('div', 'w2-tools');
      const spinBtn = btn('🔄 Turn the wheel', 'c-card', spin);
      const hintBtn = btn('💡 Hint', 'c-sun', giveHint);
      tools.append(spinBtn, hintBtn);
      wrap.append(slotBox, wheel, tools);
      api.stage.append(wrap);

      const baseHint = () => api.hint(`What is the picture? ${clue}. Tap the letters in order.`);
      function paint() {
        slots.forEach((li, k) => {
          const e = slotEls[k];
          e.className = 'aw-slot tile ' + (li === null ? 'empty' : given.has(k) ? 'given' : 'fill');
          e.textContent = li === null ? '' : letters[li];
          e.setAttribute('aria-label', li === null ? `Empty box ${k + 1}` : `Box ${k + 1}, ${letters[li]}. Tap to take it back.`);
        });
        lEls.forEach((e, i) => e.classList.toggle('used', slots.includes(i)));
      }
      function tapLetter(i) {
        if (busy || slots.includes(i)) return;
        const k = slots.indexOf(null); if (k < 0) return;
        slots[k] = i; tone(440 + k * 60, .09, 'triangle', .09);
        paint(); slotEls[k].classList.add('fill');
        if (!slots.includes(null)) check();
      }
      function tapSlot(k) {
        if (busy || slots[k] === null) return;
        const li = slots[k]; slots[k] = null; given.delete(k); sfx.tap(); paint();
        lEls[li].classList.remove('pop'); void lEls[li].offsetWidth; lEls[li].classList.add('pop');
        baseHint();
      }
      function check() {
        const w = slots.map(i => letters[i]).join('');
        if (w === word) return win();
        if (dict().has(w)) { sfx.soft(); api.hint(`${w} is a word, but it’s not the picture. Tap a box to take a letter back.`); return; }
        if (w !== lastWrong) { mistakes++; lastWrong = w; }
        sfx.soft(); wob(slotBox);
        api.hint('Not quite. Tap a box to take a letter back, then try again.');
      }
      function giveHint() {
        if (busy) return;
        let k = 0; while (k < n && slots[k] !== null && letters[slots[k]] === word[k]) k++;
        if (k >= n) return;
        hints++;
        for (let j = k; j < n; j++) { if (slots[j] !== null && !(given.has(j) && letters[slots[j]] === word[j])) { slots[j] = null; given.delete(j); } }
        const free = letters.map((_, i) => i).filter(i => !slots.includes(i) && letters[i] === word[k]);
        slots[k] = free[0]; given.add(k);
        sfx.tap(); paint();
        api.hint(`The ${ordinal(k)} letter is ${word[k]}.`);
        if (!slots.includes(null)) check();
      }
      function spin() {
        if (busy) return;
        sfx.tap();
        const keep = slots.map(i => i === null ? null : letters[i]);
        const free = letters.filter((_, i) => !slots.includes(i));
        shuffle(free);
        letters = keep.filter(c => c !== null).concat(free);
        let p = 0; for (let k = 0; k < n; k++) if (slots[k] !== null) slots[k] = p++;
        wheel.classList.remove('spin'); void wheel.offsetWidth; wheel.classList.add('spin');
        buildWheel(); paint();
      }
      function win() {
        busy = true; round++; api.rounds(total, round);
        slotEls.forEach((e, k) => api.later(() => { e.className = 'aw-slot tile right w2-win'; tone(523 * Math.pow(1.122, k), .14, 'triangle', .1); }, k * 90));
        wheel.classList.remove('spin'); void wheel.offsetWidth; wheel.classList.add('spin');
        api.hint(`Yes, it’s ${word}! ${emoji}`); api.later(() => { sfx.good(); toast(cheer()); }, n * 90);
        if (round >= total) api.done(starsFor(mistakes + hints, 1, 3));
        else api.later(play, 1500 + n * 90);
      }
      paint(); baseHint();
    }
    play();
  }

  /* =========================================================
     MINI CROSSWORD
     ========================================================= */
  function cwSpec(L) {
    if (L <= 1) return { n: 3, k: 2 };
    if (L === 2) return { n: 4, k: 3 };
    if (L === 3) return { n: 4, k: 4 };
    if (L === 4) return { n: 5, k: 4 };
    if (L === 5) return { n: 5, k: 5 };
    return { n: 5, k: pick([5, 6, 6]) };
  }
  function cwPlace(grid, n, w, r, c, dr, dc, first) {
    const len = w.length, er = r + dr * (len - 1), ec = c + dc * (len - 1);
    if (r < 0 || c < 0 || er >= n || ec >= n) return -1;
    const at = (y, x) => (y < 0 || x < 0 || y >= n || x >= n) ? null : grid[y * n + x];
    if (at(r - dr, c - dc) !== null || at(er + dr, ec + dc) !== null) return -1;
    let cross = 0;
    for (let i = 0; i < len; i++) {
      const y = r + dr * i, x = c + dc * i, g = grid[y * n + x];
      if (g !== null) { if (g !== w[i]) return -1; cross++; continue; }
      if (at(y + dc, x + dr) !== null || at(y - dc, x - dr) !== null) return -1; // side neighbours
    }
    if (cross === len) return -1;
    if (!first && cross === 0) return -1;
    return cross;
  }
  function cwRuns(grid, n) {
    const runs = [];
    for (const [dr, dc] of [[0, 1], [1, 0]]) for (let a = 0; a < n; a++) {
      let s = null;
      for (let b = 0; b <= n; b++) {
        const r = dr ? b : a, c = dr ? a : b, v = b < n ? grid[r * n + c] : null;
        if (v !== null && s === null) s = b;
        if (v === null && s !== null) {
          if (b - s >= 2) { const r0 = dr ? s : a, c0 = dr ? a : s; runs.push({ r: r0, c: c0, dr, dc, w: [...Array(b - s)].map((_, i) => grid[(r0 + dr * i) * n + c0 + dc * i]).join('') }); }
          s = null;
        }
      }
    }
    return runs;
  }
  function cwValid(P) {
    const runs = cwRuns(P.grid, P.n);
    if (runs.length !== P.words.length) return false;
    return runs.every(u => P.words.some(p => p.r === u.r && p.c === u.c && p.dr === u.dr && p.w === u.w));
  }
  function cwBuild(n, k) {
    const pool = PICS.filter(p => p[0].length >= 3 && p[0].length <= n && /^[A-Z]+$/.test(p[0]));
    for (let kk = k; kk >= 2; kk--) {
      for (let a = 0; a < 300; a++) {
        const grid = Array(n * n).fill(null), words = [], used = new Set();
        const longs = pool.filter(p => p[0].length === n);
        const f = pick(longs.length ? longs : pool);
        const dir = randInt(2), fr = dir ? 0 : randInt(n), fc = dir ? randInt(n) : 0;
        put(f, fr, fc, dir ? 1 : 0, dir ? 0 : 1);
        function put(p, r, c, dr, dc) { [...p[0]].forEach((ch, i) => { grid[(r + dr * i) * n + c + dc * i] = ch; }); words.push({ w: p[0], e: p[1], clue: p[2], r, c, dr, dc }); used.add(p[0]); }
        let tries = 0;
        while (words.length < kk && tries++ < 6) {
          let placed = false;
          for (const p of shuffle(pool.slice())) {
            if (used.has(p[0])) continue;
            const opts = [];
            for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) {
              const x = cwPlace(grid, n, p[0], r, c, dr, dc, false); if (x > 0) opts.push([r, c, dr, dc, x]);
            }
            if (opts.length) { const o = pick(opts); put(p, o[0], o[1], o[2], o[3]); placed = true; break; }
          }
          if (!placed) break;
        }
        if (words.length < kk) continue;
        let rowsOk = true, colsOk = true;
        for (let i = 0; i < n; i++) {
          if (![...Array(n)].some((_, j) => grid[i * n + j] !== null)) rowsOk = false;
          if (![...Array(n)].some((_, j) => grid[j * n + i] !== null)) colsOk = false;
        }
        if (!rowsOk || !colsOk) continue;
        const P = { n, grid, words };
        if (!cwValid(P)) continue;
        // numbering
        let num = 0; const nums = {};
        for (let i = 0; i < n * n; i++) if (words.some(w => w.r * n + w.c === i)) nums[i] = ++num;
        words.forEach(w => { w.num = nums[w.r * n + w.c]; w.cells = [...w.w].map((_, j) => (w.r + w.dr * j) * n + w.c + w.dc * j); });
        words.sort((a, b) => a.num - b.num || a.dc - b.dc);
        P.nums = nums;
        return P;
      }
    }
    return null;
  }
  R.w2.cwBuild = cwBuild; R.w2.cwValid = cwValid; R.w2.cwSpec = cwSpec;

  function startCrossword(L, api) {
    L = Math.max(1, Math.floor(L) || 1);
    const sp = cwSpec(L);
    const P = cwBuild(sp.n, sp.k) || cwBuild(3, 2);
    const { n, grid, words } = P;
    const entry = Array(n * n).fill(''), locked = new Set(), given = new Set(), solved = new Set(), lastWrong = {};
    let selCell = words[0].cells[0], cur = words[0], mistakes = 0, hints = 0, finished = false;
    api.rounds(words.length, 0);

    const wrap = el('div', 'cw-wrap');
    const main = el('div', 'cw-main');
    const clueEl = el('div', 'cw-clue');
    const gEl = el('div', 'cw-grid'); gEl.style.setProperty('--n', n);
    const cells = grid.map((ch, i) => {
      if (ch === null) { const d = el('div', 'cw-cell blk'); gEl.append(d); return d; }
      const b = el('button', 'cw-cell'); b.type = 'button'; b.onclick = () => tapCell(i); gEl.append(b); return b;
    });
    const chips = el('div', 'cw-chips');
    const chipEls = words.map(w => {
      const b = el('button', 'cw-chip', `<span class="k">${w.num}${w.dc ? '→' : '↓'}</span><span class="e">${w.e}</span>`); b.type = 'button';
      b.setAttribute('aria-label', `${w.num} ${w.dc ? 'across' : 'down'}: ${w.clue}`);
      b.onclick = () => selectWord(w); chips.append(b); return b;
    });
    const clueTxt = el('span', 'cw-ct');
    const clueEm = el('span', 'cw-em');
    const hintBtn = btn('💡 Show<br>a letter', 'c-sun', giveHint); hintBtn.setAttribute('aria-label', 'Show a letter');
    clueEl.append(clueEm, clueTxt, hintBtn);
    main.append(clueEl, gEl, chips);
    const side = el('div', 'cw-side');
    const pk = makePicker(onLetter, [{ label: '⌫', aria: 'Rub out', cls: 'c-peach', fn: erase }]);
    side.append(pk.el);
    wrap.append(main, side); api.stage.append(wrap);

    const wordsAt = i => words.filter(w => w.cells.includes(i));
    function render() {
      cells.forEach((c, i) => {
        if (grid[i] === null) return;
        c.className = 'cw-cell' + (locked.has(i) ? ' ok' : '') + (cur.cells.includes(i) ? ' word' : '') + (i === selCell ? ' sel' : '') + (given.has(i) ? ' given' : '');
        c.innerHTML = (P.nums[i] ? `<span class="cw-num">${P.nums[i]}</span>` : '') + entry[i];
        c.setAttribute('aria-label', `Square ${Math.floor(i / n) + 1}, ${i % n + 1}` + (entry[i] ? ', ' + entry[i] : ', empty'));
      });
      chipEls.forEach((b, k) => { b.classList.toggle('on', words[k] === cur); b.classList.toggle('done', solved.has(words[k])); });
      clueEl.className = 'cw-clue' + (solved.has(cur) ? ' solved' : '');
      clueEm.textContent = cur.e;
      clueTxt.innerHTML = `<span class="cw-cn">${cur.num} ${cur.dc ? 'across →' : 'down ↓'} · ${cur.w.length} letters</span>${cur.clue}${solved.has(cur) ? ' ✓' : ''}`;
    }
    function baseHint() {
      api.hint(solved.has(cur) ? 'Well done! Tap another square or picture to choose the next word.' : 'Tap a square, then pick its letter below. Each picture is a word.');
    }
    function firstOpen(w) { return w.cells.find(i => !locked.has(i) && !entry[i]) ?? w.cells.find(i => !locked.has(i)) ?? w.cells[0]; }
    function selectWord(w) { if (finished) return; cur = w; selCell = firstOpen(w); sfx.tap(); render(); baseHint(); }
    function tapCell(i) {
      if (finished) return;
      const ws = wordsAt(i);
      if (i === selCell && ws.length > 1) cur = ws.find(w => w !== cur) || cur;
      else if (!ws.includes(cur)) cur = ws.find(w => !solved.has(w)) || ws[0];
      selCell = i; sfx.tap(); render(); baseHint();
    }
    function onLetter(ch) {
      if (finished) return;
      if (locked.has(selCell)) { const nx = cur.cells.find(i => !locked.has(i)); if (nx === undefined) { api.hint('That word is done. Tap another square.'); return; } selCell = nx; }
      entry[selCell] = ch; tone(500 + cur.cells.indexOf(selCell) * 50, .08, 'triangle', .08);
      const at = selCell;
      checkAt(at);
      if (finished) return;
      // advance within the current word
      if (!solved.has(cur)) {
        const pos = cur.cells.indexOf(at);
        const nxt = cur.cells.slice(pos + 1).find(i => !locked.has(i) && !entry[i]) ?? cur.cells.slice(pos + 1).find(i => !locked.has(i));
        if (nxt !== undefined) selCell = nxt;
      } else {
        const next = words.find(w => !solved.has(w));
        if (next) { cur = next; selCell = firstOpen(next); }
      }
      render();
      const c = cells[at]; c.classList.add('flash');
    }
    function checkAt(i) {
      let anyWrong = false, newly = [];
      wordsAt(i).forEach(w => {
        if (solved.has(w)) return;
        if (w.cells.some(j => !entry[j])) return;
        const s = w.cells.map(j => entry[j]).join('');
        if (s === w.w) { solved.add(w); w.cells.forEach(j => locked.add(j)); newly.push(w); }
        else { anyWrong = true; if (lastWrong[w.num + '' + w.dc] !== s) { lastWrong[w.num + '' + w.dc] = s; mistakes++; } }
      });
      if (newly.length) {
        api.rounds(words.length, solved.size);
        newly.forEach((w, q) => w.cells.forEach((j, k) => api.later(() => { cells[j].classList.remove('flash'); void cells[j].offsetWidth; cells[j].classList.add('flash'); tone(523 * Math.pow(1.122, k), .12, 'triangle', .09); }, q * 300 + k * 80)));
        if (solved.size === words.length) return win();
        toast(cheer()); api.hint(`Yes, ${newly.map(w => w.w).join(' and ')}! Now pick the next picture.`);
      } else if (anyWrong) {
        sfx.soft(); api.later(() => wob(gEl), 50);
        api.hint('Not quite. One of those letters needs to change.');
      }
    }
    function erase() {
      if (finished) return;
      if (!locked.has(selCell) && entry[selCell]) { entry[selCell] = ''; sfx.tap(); render(); return; }
      const pos = cur.cells.indexOf(selCell);
      const prev = cur.cells.slice(0, Math.max(0, pos)).reverse().find(i => !locked.has(i));
      if (prev !== undefined) { selCell = prev; entry[prev] = ''; sfx.tap(); render(); }
    }
    function giveHint() {
      if (finished) return;
      let w = solved.has(cur) ? words.find(x => !solved.has(x)) : cur;
      if (!w) return;
      cur = w;
      const i = w.cells.includes(selCell) && !locked.has(selCell) && entry[selCell] !== grid[selCell] ? selCell : w.cells.find(j => !locked.has(j) && entry[j] !== grid[j]);
      if (i === undefined) return;
      hints++; entry[i] = grid[i]; locked.add(i); given.add(i); selCell = i; sfx.tap();
      api.hint(`Here’s a letter: ${grid[i]}. It stays put for you.`);
      checkAt(i);
      if (finished) return;
      if (solved.has(cur)) { const next = words.find(x => !solved.has(x)); if (next) { cur = next; selCell = firstOpen(next); } }
      else { const nx = cur.cells.find(j => !locked.has(j) && !entry[j]); if (nx !== undefined) selCell = nx; }
      render();
    }
    function win() {
      finished = true; render(); hintBtn.disabled = true;
      api.hint('You filled the whole crossword!');
      cells.forEach((c, i) => { if (grid[i] !== null) api.later(() => { c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash', 'w2-win'); }, 400 + i * 40); });
      api.later(() => sfx.good(), 500);
      api.done(starsFor(mistakes + hints, 1, 3));
    }
    render(); baseHint();
  }
})();
