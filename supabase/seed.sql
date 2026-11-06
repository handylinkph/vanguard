-- Initial content for the Resource Library and Services Directory.
-- Library entries are original plain-language summaries written for Vanguard (draft, pending
-- expert review). Each names the official body users should consult for authoritative guidance.
-- Directory entries are limited to well-known national hotlines and are marked "unverified"
-- until an administrator confirms them with the operating agency.

insert into public.resources (slug, title, summary, body, category, hazards, source_name, source_url, reviewed_on, review_due_on, published) values
('go-bag-checklist', 'Go-bag checklist for Filipino households',
 'What to pack in a grab-and-go bag for each family member, and how to keep it ready.',
$md$## Why a go-bag?
When you must evacuate quickly, there is no time to gather supplies. A packed bag for each person means you leave with the essentials.

## Pack for each person
- Drinking water and ready-to-eat food for at least a day or two
- Flashlight, whistle and a charged power bank
- Change of clothes, raincoat, and a small blanket
- Personal hygiene items and face masks
- Copies of IDs and important documents in a waterproof pouch
- Small amount of cash in small bills
- Printed list of emergency contacts
- A few days of maintenance medicines (ask your doctor or pharmacist)

## Keep it ready
- Store bags near the door or where everyone can reach them
- Check every 6 months: replace food, water, batteries and medicines before they expire
- Use Vanguard's Kit Builder to track quantities and expiry dates$md$,
 'checklist', '{typhoon,flood,earthquake,volcano,tsunami,general}', 'Vanguard editorial — see Philippine Red Cross & NDRRMC for official guidance', 'https://redcross.org.ph', '2026-11-07', '2027-05-07', true),

('family-communication-plan', 'Making a family communication plan',
 'How to stay in touch and reunite when phone lines are busy or family members are apart.',
$md$## The basics
- Choose an **out-of-area contact** — a relative in another city everyone can text
- Agree on two **meeting places**: one near home, one outside the neighbourhood
- Teach children their parents' numbers, or put a contact card in their school bag

## When networks are busy
- Send short text messages instead of calling
- Keep calls brief and only for urgent needs
- Post a short "safe" update to family once, rather than many messages

## Practise
Run a quick check-in drill: everyone texts the out-of-area contact at an agreed time.$md$,
 'household', '{general}', 'Vanguard editorial', null, '2026-11-07', '2027-11-07', true),

('evacuation-basics', 'Evacuation basics: when and how to leave',
 'Why early evacuation saves lives and how to leave safely when your LGU advises it.',
$md$## Leave early
Pre-emptive evacuation is ordered before conditions become dangerous. Waiting until water rises or winds strengthen makes travel far riskier.

## Before you go
- Grab go-bags, medicines, documents and pets
- Turn off the main power switch and gas if it is safe to do so
- Lock your home and tell your out-of-area contact where you are going

## On the way
- Follow routes advised by your barangay or LGU
- Never walk or drive through moving floodwater
- Help neighbours who need assistance, if you can do so safely

## Where to go
Your barangay or MDRRMO can tell you the designated evacuation area. Record it in your Vanguard emergency plan. Vanguard does not track whether evacuation centres are open.$md$,
 'procedure', '{typhoon,flood,volcano,landslide,tsunami}', 'Vanguard editorial — follow your LGU/MDRRMO and NDRRMC instructions', 'https://ndrrmc.gov.ph', '2026-11-07', '2027-05-07', true),

('basic-first-aid-awareness', 'First aid awareness for households',
 'Why first aid training matters and what to keep in a home first aid kit. Not a substitute for training.',
$md$## Get trained
First aid and CPR are skills best learned hands-on from a recognised provider such as the Philippine Red Cross. Reading is not a substitute for training.

## Home first aid kit
- Sterile gauze, bandages and adhesive tape
- Antiseptic solution and cotton
- Disposable gloves and scissors
- Thermometer
- Any personal medicines your family needs (ask your doctor)

## In an emergency
Call 911. If you are trained, provide first aid within your training while waiting for help.$md$,
 'health', '{general}', 'Vanguard editorial — consult the Philippine Red Cross for training', 'https://redcross.org.ph', '2026-11-07', '2027-05-07', true),

('caring-for-older-adults-and-pwd', 'Preparing with older adults and persons with disabilities',
 'Planning steps so that every household member — including those who need assistance — can get to safety.',
$md$## Plan together
- Ask the person what help they need; respect their choices
- Assign a primary and a backup helper for evacuation
- Keep spare eyeglasses, hearing aid batteries, mobility aids and maintenance medicines in the kit

## Write it down
Keep a short care card: medicines, allergies (if they consent to share), doctor's contact and how to communicate with them.

## Register if available
Some LGUs keep lists of residents who need assistance during evacuation. Ask your barangay.$md$,
 'household', '{general}', 'Vanguard editorial', null, '2026-11-07', '2027-11-07', true),

('pets-in-emergencies', 'Pets in emergencies',
 'Include your animals in your emergency plan and kit.',
$md$## Prepare
- Food and water for several days, a leash or carrier, and vaccination records
- A recent photo of your pet in case you are separated
- Identify places that may accept pets, such as relatives' homes; not all evacuation centres can

## During evacuation
Never leave pets tied up during floods. If you must leave them, give them access to higher ground.$md$,
 'household', '{typhoon,flood,volcano}', 'Vanguard editorial', null, '2026-11-07', '2027-11-07', true),

('water-storage-and-safety', 'Storing and treating drinking water',
 'How much water to store, how to keep it safe, and what to do when the supply is uncertain.',
$md$## How much
A common planning estimate is about **4 litres per person per day** for drinking and basic hygiene. Store at least 3 days' worth.

## Store safely
- Use clean, food-grade containers with tight lids
- Keep away from sunlight and chemicals
- Replace stored tap water every 6 months; follow expiry dates on bottled water

## When unsure
After floods or supply interruptions, follow local advisories. Boiling water is a widely used method to make it safer to drink.$md$,
 'household', '{typhoon,flood,earthquake,general}', 'Vanguard editorial — follow your local water utility and DOH advisories', null, '2026-11-07', '2027-05-07', true),

('school-drill-guide', 'Running a school earthquake drill',
 'A simple sequence for planning, running and reviewing a school earthquake drill.',
$md$## Plan
1. Set the date and inform parents in advance
2. Assign roles: drill coordinator, building wardens, headcount officers, first aiders
3. Confirm assembly areas away from buildings, walls and power lines
4. Plan assistance for learners with disabilities

## Run
1. Signal the start: everyone Drops, Covers and Holds On
2. When the shaking "stops", evacuate calmly by the planned routes
3. Teachers take headcount at the assembly area and report missing learners

## Review
Record evacuation time, participants and issues in Vanguard's organization drills, then assign corrective actions.$md$,
 'school', '{earthquake}', 'Vanguard editorial — align with DepEd and LGU DRRM guidance', null, '2026-11-07', '2027-05-07', true),

('business-continuity-basics', 'Business continuity basics for small businesses',
 'Keep serving customers and paying staff after a disruption.',
$md$## Identify what matters most
List the activities your business cannot stop for long (e.g. payroll, orders, key suppliers) and how long you could manage without each.

## Reduce disruption
- Back up records off-site or to the cloud
- Keep emergency contacts for staff, suppliers and customers
- Know your insurance coverage
- Plan how staff will communicate and where they will work if the site is closed

## Practise and review
Run a short tabletop exercise each year and update the plan.$md$,
 'business', '{general}', 'Vanguard editorial', null, '2026-11-07', '2027-11-07', true),

('community-preparedness-circle', 'Starting a neighbourhood preparedness circle',
 'How neighbours can prepare together without replacing official response.',
$md$## Start small
Invite a few households on your street or purok. Create a group in Vanguard and share an invitation link.

## Useful first activities
- Map the evacuation area and safe routes together
- Identify neighbours who may need help evacuating (with their consent)
- Organise a joint earthquake or fire drill
- Share tips for kits and household plans

## Know the limits
Community groups support preparedness. During emergencies, follow your barangay and LGU, and call 911 for urgent help.$md$,
 'community', '{general}', 'Vanguard editorial', null, '2026-11-07', '2027-11-07', true),

('financial-preparedness-basics', 'Financial preparedness basics',
 'Emergency savings, document safety and planning for recovery costs.',
$md$## Emergency fund
Build savings gradually. A common guideline is 3–6 months of essential expenses over time — start with any amount.

## Cash on hand
ATMs and e-wallets may not work during power or network outages. Keep some cash in small bills.

## Protect documents
Keep copies of IDs, land titles, insurance policies and bank details in a waterproof pouch and a secure digital location.

## After a disaster
Record expenses and damage with photos. Check with SSS/GSIS, PhilHealth and Pag-IBIG about calamity programs you may qualify for. This is general information, not financial advice.$md$,
 'finance', '{general}', 'Vanguard editorial', null, '2026-11-07', '2027-05-07', true),

('power-outage-safety', 'Power outage safety',
 'Staying safe and comfortable during extended brownouts after storms.',
$md$## Prepare
- Flashlights and spare batteries (avoid candles where possible)
- Charged power banks and a battery or hand-crank radio
- Know how to manually open electric gates or garage doors

## During
- Unplug sensitive appliances to protect them from surges when power returns
- Never run generators indoors or in enclosed spaces — exhaust can be deadly
- Keep refrigerator doors closed to keep food cold longer

## After
Discard food that has been unrefrigerated too long. When in doubt, throw it out.$md$,
 'procedure', '{typhoon,general}', 'Vanguard editorial', null, '2026-11-07', '2027-05-07', true)
on conflict (slug) do nothing;

insert into public.services (name, category, phone, scope, source_name, source_url, verification, last_reviewed_on, notes, published) values
('National Emergency Hotline', 'hotline', '911', 'national', 'Emergency 911 (Philippine government)', null, 'unverified', '2026-11-07', 'Nationwide emergency number. Administrators should confirm details with the operating agency before marking verified.', true),
('Philippine Red Cross hotline', 'hotline', '143', 'national', 'Philippine Red Cross', 'https://redcross.org.ph', 'unverified', '2026-11-07', 'Humanitarian services hotline. Confirm current number on the Philippine Red Cross website.', true)
on conflict do nothing;
