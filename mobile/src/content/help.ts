export const SUPPORT_EMAIL = "tiyanithebest@gmail.com";

/** Help page questions, written from how the app actually works. */
export const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I get verified as a pilot?",
    a: "Open Profile, fill in your operating base, service radius and services, then upload your remote pilot licence (a photo or PDF) and tap Submit for verification. An AgricDrone Hub admin checks it. If it isn't approved you'll see the reason, can fix it and submit again.",
  },
  {
    q: "Why can't I bid on a job?",
    a: "You can bid once your verification is approved, only on jobs that are still open, and once per job. Spraying jobs are on compliance hold and don't take bids.",
  },
  {
    q: "How does a farm owner choose a pilot?",
    a: "Open the job and tap View bids. Compare price, timeframe and message, and open a pilot's profile to see their completed jobs, photos and ratings. When you select a pilot, the other bids are declined.",
  },
  {
    q: "How does a job get completed?",
    a: "The pilot taps Mark complete when the work is done. The farm owner then taps Confirm complete, and after that can rate the pilot.",
  },
  {
    q: "Why is my spraying job on hold?",
    a: "Agricultural spraying is a restricted drone service in South Africa. AgricDrone Hub keeps spraying jobs on compliance hold: they stay visible but can't receive bids or be assigned.",
  },
  {
    q: "Who can see my licence?",
    a: "Only AgricDrone Hub admins, through a secure link that expires after 5 minutes. Every view is recorded. Other users never see it.",
  },
  {
    q: "Does AgricDrone Hub handle payment?",
    a: "No. Prices in jobs and bids show what was agreed; payment is arranged between the farm owner and the pilot.",
  },
  {
    q: "How do I report a problem with a job post or review?",
    a: "On a job, tap Report this job post and choose what's wrong. Pilots can report a review about them from their profile. An admin reviews every report.",
  },
  {
    q: "I forgot my password. What now?",
    a: "On the sign-in screen tap Forgot password? We'll email you a 6-digit code that works for 15 minutes.",
  },
  {
    q: "The app says it's waking up, or can't reach AgricDrone Hub",
    a: "Our server sleeps when nobody is using it, so the first load can take up to a minute. If you see You're offline, check your mobile data or Wi-Fi.",
  },
  {
    q: "How do I turn off the sounds or vibration?",
    a: "Open Profile and use the Sounds and Vibration switches.",
  },
];
