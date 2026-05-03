/* global window */
(function () {
  'use strict';

  var START_DATE_STR = '2025-05-05';

  var SCHEDULE_MON_SUN = [
    'CHEST',
    'BODY_CORE',
    'CHEST',
    'REST',
    'CHEST',
    'FULL_BODY',
    'REST'
  ];

  function weekdayMonday0(d) {
    return (d.getDay() + 6) % 7;
  }

  function phaseForDay(dayNum) {
    if (dayNum <= 14) return 1;
    if (dayNum <= 28) return 2;
    return 3;
  }

  function workoutTypeForDayNum(dayNum) {
    var td = typeof window !== 'undefined' ? window.TRANSFORM_DATA : null;
    var startStr = td && td._programStart ? td._programStart : START_DATE_STR;
    var start = new Date(startStr + 'T12:00:00');
    var t = new Date(start);
    t.setDate(t.getDate() + (dayNum - 1));
    return SCHEDULE_MON_SUN[weekdayMonday0(t)];
  }

  var warmUp = [
    { name: 'Arm circles', duration: '30 sec forward, 30 sec backward', detail: 'Stand tall, extend arms to sides, rotate in small circles gradually widening.' },
    { name: 'Shoulder rolls', duration: '30 sec forward, 30 sec backward', detail: 'Lift shoulders up, roll back and down with control. Reverse direction halfway.' },
    { name: 'Light jog in place', duration: '2 min', detail: 'Easy pace, lift knees slightly, pump arms lightly. Breathe steady.' },
    { name: 'Hip circles', duration: '30 sec each side', detail: 'Hands on hips, circle hips clockwise then counter-clockwise per side.' },
    { name: 'Wrist rotations', duration: '30 sec', detail: 'Interlace fingers or rotate wrists slowly both directions to prep for push-ups.' }
  ];

  var coolDown = [
    { name: 'Chest doorframe stretch', duration: '30 sec each side', detail: 'Forearm on doorframe, step through gently until chest stretches.' },
    { name: "Child's pose", duration: '45 sec', detail: 'Knees wide, sit back toward heels, arms extended, breathe into back.' },
    { name: 'Cat-cow stretch', duration: '1 min (10 slow reps)', detail: 'On hands and knees, alternate arching and rounding spine slowly.' },
    { name: 'Seated forward fold', duration: '30 sec', detail: 'Sit with legs extended or bent, hinge from hips, ease into hamstrings.' },
    { name: 'Deep belly breathing', duration: '2 min', detail: 'Inhale 4 sec, hold 4 sec, exhale 4 sec. Relax shoulders.' }
  ];

  var restActivities = [
    { name: 'Light walk', duration: '20–30 min easy pace', detail: 'Easy conversational pace. Promotes blood flow without taxing muscles.' },
    { name: 'Full body stretching', duration: '15 min', detail: 'Standing quad stretch 30 sec each leg; chest doorframe 30 sec each side; seated hamstring 30 sec each leg; child\'s pose 45 sec; cat-cow 10 slow reps.' },
    { name: 'Box breathing', duration: '5 min', detail: 'Inhale 4 sec, hold 4 sec, exhale 4 sec, hold 4 sec. Repeat calmly.' }
  ];

  var restMessage =
    'Muscles grow during rest, not during training.\n\nToday is not a wasted day — it is a growth day.';

  var workouts = {
    CHEST: {
      1: [
        { name: 'Push-ups', meta: '4 × 6–10 reps · 60 sec rest', steps: ['Place hands slightly wider than shoulder-width on the floor.', 'Keep body in a straight line from head to heels — no sagging.', 'Lower chest until it nearly touches the floor.', 'Elbows at 45° angle to body — not flared out wide.', 'Push back up, squeeze chest at the top.', 'Breathe in going down, out going up.', "Can't do 6? Do them on knees and build up."] },
        { name: 'Incline Push-ups', meta: '3 × 10–12 reps · 60 sec rest', steps: ['Place hands on a raised surface — bed edge, chair, or table.', 'The higher the surface the easier it is.', 'This targets the upper chest specifically.', 'Lower chest to the surface, feel the stretch.', 'Push back explosively. This builds the upper chest shelf.'] },
        { name: 'Wide Push-ups', meta: '3 × 8–10 reps · 60 sec rest', steps: ['Place hands much wider than shoulders — about 1.5× width.', 'Lower slowly — 3 seconds down, normal speed up.', 'Feel the inner and outer chest stretch deeply.', 'Builds chest width. Don\'t rush the descent.'] },
        { name: 'Plank Hold', meta: '3 × 20–30 sec · 30 sec rest', steps: ['Forearms on floor, elbows directly under shoulders.', 'Body in a perfectly straight line — no raised hips, no sag.', 'Squeeze abs, glutes, and quads simultaneously.', 'Look at the floor. Neck neutral. Breathe steadily.'] }
      ],
      2: [
        { name: 'Push-ups', meta: '5 × 10–15 reps · 60 sec rest', steps: ['Same form as Phase 1 but full range every rep.', 'Add a 2-second pause at the bottom — more tension.', 'Chase the chest pump. Feel it burning by rep 12.'] },
        { name: 'Decline Push-ups', meta: '3 × 8–12 reps · 60 sec rest', steps: ['Place FEET on raised surface (chair or bed — ~40cm high).', 'Hands on the floor. Body angled downward.', 'This fires the lower chest — a different feeling.', 'Lower slowly. Push explosively back up.', 'Keep core tight throughout. Hips must not sag.'] },
        { name: 'Diamond Push-ups', meta: '3 × 6–10 reps · 60 sec rest', steps: ['Place both hands together under chest.', 'Thumbs and index fingers touch — forming a diamond shape.', 'Lower chest toward your hands.', 'Hits inner chest and triceps — the hardest variation.', 'Too hard? Do them on knees. Keep going regardless.'] },
        { name: 'Incline Push-ups', meta: '3 × 12–15 reps · 45 sec rest', steps: ['Same as Phase 1 incline — more reps, shorter rest now.', 'Control the descent, explode up.'] },
        { name: 'Plank with Shoulder Taps', meta: '3 × 40–50 sec · 30 sec rest', steps: ['Hold plank position. While holding, tap opposite shoulder with one hand at a time.', 'Keep hips from rotating. Stay rigid from head to heels.'] }
      ],
      3: [
        { name: 'Push-ups', meta: '5 × 15–20 reps · full depth, 2 sec pause bottom', steps: ['Maintain strict form from Phase 2.', 'Pause 2 seconds at bottom each rep.', 'Full depth every rep.'] },
        { name: 'Decline Push-ups', meta: '4 × 10–15 reps · feet higher, more angle', steps: ['Elevate feet more than Phase 2 if possible.', 'Control descent, powerful ascent.', 'Core locked in.'] },
        { name: 'Diamond Push-ups', meta: '4 × 10–12 reps · slow descent', steps: ['Slow eccentric for maximum tension.', 'Keep elbows tracking — don\'t flare excessively.'] },
        { name: 'Wide Push-ups', meta: '3 × 15 reps · explosive push', steps: ['Wide hand placement.', 'Explode up, feel width through chest.', 'Controlled lowering.'] },
        { name: 'Weighted Push-ups', meta: '3 × 8–12 reps · 60 sec rest', steps: ['Place a backpack with books on your upper back.', 'Someone can hold it or strap it. Same push-up form.', 'The added weight makes every rep harder. Go slower.'] },
        { name: 'Plank + side planks', meta: '3 × 60 sec plank + 30 sec each side', steps: ['Hold standard plank with perfect line.', 'Side plank each side — elbow under shoulder, hips high.', 'Breathe steady throughout.'] }
      ]
    },
    BODY_CORE: {
      1: [
        { name: 'Bodyweight Squats', meta: '3 × 10–15 reps · 60 sec rest', steps: ['Stand feet shoulder-width apart, toes slightly outward.', 'Push hips back and bend knees — like sitting in a chair.', 'Thighs go parallel to floor or lower.', 'Knees track over toes — do not let them cave inward.', 'Drive through heels to stand back up.', 'Keep chest up and back straight the whole time.'] },
        { name: 'Plank', meta: '3 × 30 sec · 30 sec rest', steps: ['Forearms or hands under shoulders, straight body line.', 'Brace core and glutes.', 'Neutral neck, steady breathing.'] },
        { name: 'Crunches', meta: '3 × 15 reps · 45 sec rest', steps: ['Lie on back, knees bent, feet flat on floor.', 'Hands lightly behind head — do NOT pull your neck.', 'Curl shoulders up off the floor, squeeze abs at top.', 'Lower slowly — 2 seconds down. Do not drop back.', 'This is NOT a sit-up. You only come up about 30 degrees.'] },
        { name: 'Glute Bridges', meta: '3 × 15 reps · 45 sec rest', steps: ['Lie on back, knees bent, feet flat on floor.', 'Drive hips up by squeezing glutes — not your lower back.', 'Hold at the top for 1 second and squeeze hard.', 'Lower slowly back down.', 'Builds lower body and supports push-up strength.'] },
        { name: 'Leg Raises', meta: '3 × 10 reps · 45 sec rest', steps: ['Lie flat on back, legs straight.', 'Press lower back into floor — keep it there throughout.', 'Raise legs to 90 degrees. Lower slowly — don\'t touch down.', 'Too hard? Bend knees slightly.'] }
      ],
      2: [
        { name: 'Squats', meta: '4 × 15–20 reps · 60 sec rest', steps: ['Same as Phase 1 but add 2-second pause at the bottom.', 'Drive up powerfully through mid-foot and heel.'] },
        { name: 'Jump Squats', meta: '3 × 10 reps · 60 sec rest', steps: ['Squat down normally, then explode upward and jump.', 'Land softly with bent knees. Absorb the landing.', 'Pure power and calorie burn.'] },
        { name: 'Plank with Hip Dips', meta: '3 × 40–50 sec · 30 sec rest', steps: ['Hold plank. Rotate hips side to side slowly.', 'Dip each hip toward the floor and back up.', 'Keep shoulders stacked over elbows/hands.'] },
        { name: 'Bicycle Crunches', meta: '3 × 20 reps · 45 sec rest', steps: ['Lie back, hands behind head. Lift shoulders off floor.', 'Bring right elbow to left knee while extending right leg.', 'Alternate sides in a pedaling motion. Slow and controlled.', 'Full rotation every rep — do not rush this.'] },
        { name: 'Mountain Climbers', meta: '3 × 20 reps · 45 sec rest', steps: ['Start in a push-up position. Core tight.', 'Drive one knee to chest, then switch fast.', 'Fast pace. Keep hips low — do not raise them.'] },
        { name: 'Glute Bridges', meta: '3 × 20 reps · 45 sec rest', steps: ['Hold 2 seconds at the top each rep.', 'Squeeze glutes hard, avoid overarching lower back.'] }
      ],
      3: [
        { name: 'Squats', meta: '4 × 20–25 reps · add backpack weight', steps: ['Wear a loaded backpack like weighted squats.', 'Depth and knee tracking stay perfect.', 'Pause briefly at bottom if needed for control.'] },
        { name: 'Lunges', meta: '3 × 12 reps each leg · 60 sec rest', steps: ['Step forward. Back knee drops near the floor.', 'Front knee must NOT pass your toes excessively.', 'Push back to starting position through front heel.', 'Builds balance and leg strength simultaneously.'] },
        { name: 'Plank + side planks', meta: '3 × 60 sec + 30 sec each side', steps: ['Solid plank line, then side planks with stacked feet or staggered.', 'Keep hips high and shoulders engaged.'] },
        { name: 'Bicycle Crunches', meta: '4 × 25 reps · slow rotation', steps: ['Slow, full elbow-to-knee rotation each rep.', 'Shoulders stay lifted.'] },
        { name: 'V-Ups', meta: '3 × 12 reps · 45 sec rest', steps: ['Lie flat. Simultaneously raise arms and legs.', 'Touch your toes at the top. Lower slowly.', 'Full core engagement. The hardest core move here.'] },
        { name: 'Mountain Climbers', meta: '4 × 30 reps · fast', steps: ['Fast knees to chest.', 'Hips stay low — running plank position.'] }
      ]
    },
    FULL_BODY: {
      1: [
        { name: 'Push-ups', meta: '3 × 8–10 reps · 60 sec rest', steps: ['Standard push-up form, full range.', 'Brace core throughout.'] },
        { name: 'Squats', meta: '3 × 10–15 reps · 60 sec rest', steps: ['Same cues as body day squats — depth and knee tracking.'] },
        { name: 'Plank', meta: '3 × 30 sec · 30 sec rest', steps: ['Straight line, steady breathing.'] },
        { name: 'Crunches', meta: '2 × 15 reps · 45 sec rest', steps: ['Controlled crunch — no neck pulling.'] },
        { name: 'Glute Bridges', meta: '3 × 15 reps · 45 sec rest', steps: ['Squeeze glutes at top, slow descent.'] }
      ],
      2: [
        { name: 'Push-ups', meta: '4 × 12 reps · 60 sec rest', steps: ['Maintain tempo and depth across sets.'] },
        { name: 'Squats', meta: '4 × 15 reps · 60 sec rest', steps: ['Optional pause at bottom for extra tension.'] },
        { name: 'Diamond Push-ups', meta: '3 × 8 reps · 60 sec rest', steps: ['Diamond hand position under chest.', 'Scale to knees if needed.'] },
        { name: 'Mountain Climbers', meta: '3 × 20 reps · 45 sec rest', steps: ['Quick knees, low hips.'] },
        { name: 'Bicycle Crunches', meta: '3 × 20 reps · 45 sec rest', steps: ['Slow rotations, elbows wide.'] },
        { name: 'Plank', meta: '3 × 50 sec · 30 sec rest', steps: ['Longer hold — fight sagging hips.'] }
      ],
      3: [
        { name: 'Push-ups', meta: '5 × 15 reps · 60 sec rest', steps: ['High volume with perfect reps.'] },
        { name: 'Decline Push-ups', meta: '3 × 10 reps · 60 sec rest', steps: ['Feet elevated, emphasize lower chest.', 'Keep core locked.'] },
        { name: 'Squats', meta: '4 × 20 reps · 60 sec rest', steps: ['Deep controlled reps, steady tempo.'] },
        { name: 'Lunges', meta: '3 × 12 reps each leg · 60 sec rest', steps: ['Balance and depth each step.'] },
        { name: 'Plank + side planks', meta: '3 × 60 sec + side planks', steps: ['Combine front and side stability work.'] },
        { name: 'V-Ups', meta: '3 × 15 reps · 45 sec rest', steps: ['Reach for toes, lower with control.'] },
        { name: 'Mountain Climbers', meta: '3 × 30 reps · 45 sec rest', steps: ['Fast pace, hips low.'] }
      ]
    }
  };

  var meals = [
    { time: '8:00 AM', name: 'Breakfast', food: '250ml full-fat milk + 2 bread slices + 1 tbsp peanut butter', protein: '14–16g', tip: 'First meal of the day. Never skip this.' },
    { time: '10:00 AM', name: 'Office Snack', food: 'Banana milkshake — thick, milk-based, 300ml', protein: '6–8g', tip: 'Easy to carry or buy outside. No biscuits.' },
    { time: '1:00 PM', name: 'Lunch', food: '5 roti + sabji + lassi (300ml) + 2 boiled eggs', protein: '30–35g', tip: 'The 2 eggs are non-negotiable at lunch every day.' },
    { time: '5:00 PM', name: 'Evening Snack', food: 'One fistful of peanuts or roasted chana (₹10)', protein: '5–6g', tip: 'Replace all biscuits and chips with this.' },
    { time: '6:30 PM', name: 'Pre-Workout Fuel', food: 'Lassi (300ml) or badam milk', protein: '6–8g', tip: 'This fuels your 9 PM session. Do not skip.' },
    { time: '9:45 PM', name: 'Post-Workout', food: '1 banana + 250ml milk', protein: '6–8g', tip: 'Muscle recovery window. Eat this immediately after.' },
    { time: '10:30 PM', name: 'Dinner', food: 'Chicken thali (2 pcs) + dal + roti OR chicken fried rice', protein: '30–35g', tip: 'Full proper meal. Never replace dinner with snacks.' },
    { time: '11:30 PM', name: 'Before Sleep', food: '2 bread slices + 1 tbsp peanut butter', protein: '8–10g', tip: 'Slow protein release while you sleep. Max 2 tbsp PB/day.' }
  ];

  var waterGlassTips = [
    'Drink on waking up — before anything else',
    'With breakfast at 8 AM',
    'Mid-morning at the office',
    'Before lunch at 1 PM',
    'Afternoon — keeps energy up',
    'Before pre-workout meal at 6:30 PM',
    'During or right after workout at 9 PM',
    'Before sleep — recovery hydration'
  ];

  var waterReminders = [
    { glass: 1, time: 'Wake up', purpose: 'Hydration before breakfast' },
    { glass: 2, time: '~8:00 AM', purpose: 'With breakfast' },
    { glass: 3, time: '~10:30 AM', purpose: 'Mid-morning office' },
    { glass: 4, time: '~12:30 PM', purpose: 'Before lunch' },
    { glass: 5, time: '~3:00 PM', purpose: 'Afternoon energy' },
    { glass: 6, time: '~6:00 PM', purpose: 'Before pre-workout fuel' },
    { glass: 7, time: '~9:00 PM', purpose: 'Training hydration' },
    { glass: 8, time: '~11:00 PM', purpose: 'Before sleep recovery' }
  ];

  function hydrationMessage(glasses) {
    var g = Math.min(8, Math.max(0, glasses | 0));
    if (g <= 2) return 'Very low — drink water now';
    if (g <= 4) return 'Getting there, keep going';
    if (g <= 6) return 'Good progress, almost there';
    if (g === 7) return 'Almost at goal';
    return 'Hydration goal complete';
  }

  var quotes = [
    'Every expert was once a beginner. Start.',
    'The body achieves what the mind believes.',
    'Three days in. Most people quit. You did not.',
    'Discipline is showing up when you do not feel like it.',
    'Your future self is watching. Do not let him down.',
    'Progress, not perfection. Keep moving.',
    'One week done. Seven days stronger than before.',
    'The second week separates the committed from the curious.',
    'Pain is temporary. A strong body is permanent.',
    'Ten days in. One third complete. You are doing this.',
    'Showing up is ninety percent of transformation.',
    'Your chest is growing. You may not see it yet — it is happening.',
    'Most people never even start. You are on Day 13.',
    'Two weeks complete. Strength is undeniable now.',
    'Phase 2 begins. Harder workouts. Better results.',
    'You have built a habit. Now build the body.',
    'The mirror catches up to the work eventually.',
    'Eat right, train hard, sleep well. Repeat.',
    'Nineteen days without giving up. That is character.',
    'Two thirds done. The change is real now.',
    'Twenty-one days — chest activation is fully happening.',
    'You are not the same person who started 22 days ago.',
    'Week 4. This is where legends are made.',
    'Your body is your most valuable asset. Invest daily.',
    'Five days left. Every rep counts double now.',
    'Twenty-six days of choosing yourself. Keep choosing.',
    'The finish line is close. Sprint, do not coast.',
    'Twenty-eight days of push-ups, protein, and persistence.',
    'Second to last day. Go absolutely all out.',
    'Day 30. You made it. Now this is your lifestyle.'
  ];

  var dietTips = [
    'Hit 95–105g protein daily — eggs at lunch are mandatory.',
    'Replace packaged snacks with peanuts or roasted chana.',
    'Never skip breakfast or pre-workout fuel before 9 PM training.',
    'Post-workout banana + milk within 30 minutes.',
    'Keep dinner as a full meal — not snack substitutes.'
  ];

  var milestones = [
    { day: 7, label: 'Strength' },
    { day: 14, label: 'Endurance' },
    { day: 21, label: 'Activation' },
    { day: 30, label: 'Transform' }
  ];

  window.TRANSFORM_DATA = {
    START_DATE_STR: START_DATE_STR,
    /** Set by app.js from localStorage transform_start_date (defaults to first-open calendar day). */
    _programStart: null,
    TOTAL_DAYS: 30,
    SCHEDULE_MON_SUN: SCHEDULE_MON_SUN,
    weekdayMonday0: weekdayMonday0,
    phaseForDay: phaseForDay,
    workoutTypeForDayNum: workoutTypeForDayNum,
    warmUp: warmUp,
    coolDown: coolDown,
    restActivities: restActivities,
    restMessage: restMessage,
    workouts: workouts,
    meals: meals,
    waterGlassTips: waterGlassTips,
    waterReminders: waterReminders,
    hydrationMessage: hydrationMessage,
    quotes: quotes,
    dietTips: dietTips,
    milestones: milestones,
    proteinGoalMid: 100,
    workoutHour: 21,
    workoutMinute: 0
  };
})();
