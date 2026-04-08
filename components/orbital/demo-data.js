export const DEMO_ACCOUNTS = [
  {
    id: "a1",
    email: "michael.torres@gmail.com",
    name: "Michael Torres",
    color: "#5B8EF8",
    label: "Personal",
  },
  {
    id: "a2",
    email: "mtorres@acmeventures.com",
    name: "Michael Torres",
    color: "#14B8A6",
    label: "Acme Ventures",
  },
  {
    id: "a3",
    email: "mike@heliospharma.com",
    name: "Michael Torres",
    color: "#10B981",
    label: "Helios Pharma",
  },
  {
    id: "a4",
    email: "m.torres@nimbuslogistics.com",
    name: "Michael Torres",
    color: "#F59E0B",
    label: "Nimbus Logistics",
  },
  {
    id: "a5",
    email: "torres@ridgelinedata.io",
    name: "Michael Torres",
    color: "#7C9BF8",
    label: "Ridgeline Data",
  },
];

export const DEMO_THREADS = [
  {
    id: "t1",
    accountId: "a2",
    subject: "Board deck — need Q1 actuals ASAP",
    status: "needs_response",
    starred: true,
    lastActivity: "2 hours ago",
    lastActivityTs: Date.now() - 7_200_000,
    preview:
      "Mike — Board meeting is Thursday morning. I still don't have the updated deck...",
    participants: [
      { name: "Rachel Kim", email: "rachel@acmeventures.com", role: "CEO" },
    ],
    messages: [
      {
        id: "m1",
        from: { name: "Rachel Kim", email: "rachel@acmeventures.com" },
        time: "Mar 30, 9:15 AM",
        body:
          "Mike — Quick heads up, the board meeting is confirmed for Thursday April 3rd. I'll need the updated deck with Q1 actuals by Wednesday EOD. Key things I want to cover:\n\n1. Cash position and updated runway\n2. Bridge from Q4 forecast to Q1 actuals\n3. Headcount plan vs. actual\n\nLet me know if you need anything from our side to pull this together.",
      },
      {
        id: "m2",
        from: { name: "You", email: "mtorres@acmeventures.com" },
        time: "Mar 30, 11:42 AM",
        body:
          "Rachel — Got it, will have the deck ready by Wednesday. I'll pull the Q1 actuals from QBO today and start on the bridge analysis. One question: do you want me to include the Series B scenario modeling or keep it focused on operating metrics?\n\nBest,\nMike",
      },
      {
        id: "m3",
        from: { name: "Rachel Kim", email: "rachel@acmeventures.com" },
        time: "Mar 30, 12:10 PM",
        body:
          "Let's keep the board deck focused on operating metrics. We can do the Series B modeling as a separate exercise after the board meeting.\n\nAlso, Lisa mentioned the 409A draft came in. Can you review that too before I meet with the comp committee next week?",
      },
      {
        id: "m4",
        from: { name: "Rachel Kim", email: "rachel@acmeventures.com" },
        time: "Today, 9:12 AM",
        body:
          "Mike — Following up on this. I know I sent a Slack message too but want to make sure this doesn't slip. The investors specifically asked about the variance between Q4 forecast and Q1 actuals, so the bridge slide is critical.\n\nAlso, our cash balance looks different in QBO than what I expected. Can you double-check we're not including the restricted cash from the equipment financing?",
      },
    ],
  },
  {
    id: "t2",
    accountId: "a2",
    subject: "409A valuation — draft ready for review",
    status: "needs_response",
    starred: false,
    lastActivity: "Yesterday",
    lastActivityTs: Date.now() - 86_400_000,
    preview:
      "The 409A firm sent over the draft valuation report. A few things jumped out...",
    participants: [
      { name: "Lisa Novak", email: "lisa@acmeventures.com", role: "Controller" },
    ],
    messages: [
      {
        id: "m5",
        from: { name: "Lisa Novak", email: "lisa@acmeventures.com" },
        time: "Yesterday, 4:30 PM",
        body:
          "Hi Mike,\n\nThe 409A firm sent over the draft valuation report. A few things that jumped out to me:\n\n1. They're using a 35% DLOM — up from 30% last year. Seems aggressive.\n2. Revenue multiple of 4.2x feels conservative given we grew 40% YoY\n3. Common stock fair value came in at $1.82/share vs. $2.15 last round\n\nI'm not sure if I should push back on the DLOM or the revenue multiple first. What's your read?\n\nThey want our comments back by April 8.\n\nThanks,\nLisa",
      },
    ],
  },
  {
    id: "t3",
    accountId: "a3",
    subject: "Revenue recognition on NIH grant milestone",
    status: "needs_response",
    starred: false,
    lastActivity: "5 hours ago",
    lastActivityTs: Date.now() - 18_000_000,
    preview:
      "We hit the Phase 1 milestone on the NIH grant and received the $450K...",
    participants: [
      { name: "James Whitfield", email: "james@heliospharma.com", role: "Controller" },
    ],
    messages: [
      {
        id: "m6",
        from: { name: "James Whitfield", email: "james@heliospharma.com" },
        time: "Mar 28, 2:15 PM",
        body:
          "Mike,\n\nQuick question on the NIH grant. We're about to hit the Phase 1 milestone and I want to make sure I handle the accounting correctly. The grant agreement specifies $450K for 'completion of Phase 1 clinical endpoints.' Should I set up a receivable now or wait until the milestone is formally certified?\n\nAlso, do you have a preference on whether we use ASC 606 or ASC 958 for grants? I've seen it done both ways.\n\nThanks,\nJames",
      },
      {
        id: "m7",
        from: { name: "You", email: "mike@heliospharma.com" },
        time: "Mar 28, 4:45 PM",
        body:
          "James — Good question. Let's wait for formal certification before recognizing the receivable. On the accounting framework, for government grants like NIH, I generally prefer ASC 958 (contributions) rather than 606.\n\nThat said, let's discuss once you actually hit the milestone and I can review the specific language in the grant agreement.\n\nBest,\nMike",
      },
      {
        id: "m8",
        from: { name: "James Whitfield", email: "james@heliospharma.com" },
        time: "Today, 10:22 AM",
        body:
          "Mike,\n\nWe hit the Phase 1 milestone last week and received the $450K payment yesterday. I'm ready to book this but had a complication — the primary endpoint was met, but we're still running some secondary analyses.\n\nDo we recognize the full $450K now since the primary endpoint is complete, or should we defer a portion? The grant language says 'satisfactory completion of Phase 1 clinical endpoints' — plural.\n\nOur auditors are going to ask about this for the Q1 review.\n\nThanks,\nJames",
      },
    ],
  },
  {
    id: "t4",
    accountId: "a4",
    subject: "Credit facility — revised term sheet from SVB",
    status: "needs_response",
    starred: false,
    lastActivity: "2 days ago",
    lastActivityTs: Date.now() - 172_800_000,
    preview:
      "Got the revised term sheet back from SVB. They moved on the interest rate...",
    participants: [
      { name: "Carlos Mendez", email: "carlos@nimbuslogistics.com", role: "CEO" },
      { name: "Sarah Chen", email: "sarah@nimbuslogistics.com", role: "VP Finance" },
    ],
    messages: [
      {
        id: "m9",
        from: { name: "Carlos Mendez", email: "carlos@nimbuslogistics.com" },
        time: "Apr 1, 10:30 AM",
        body:
          "Mike, Sarah —\n\nGot the revised term sheet back from SVB. They moved on the interest rate (SOFR + 275bps, down from 325) and the revenue covenant (dropped from 1.5x to 1.25x). But they're still asking for a personal guarantee from me on the first $500K.\n\nMike — can you review the financial covenants and let me know if there are any red flags? Also curious if the personal guarantee is standard for a company our size or if we should push back.\n\nCarlos",
      },
      {
        id: "m10",
        from: { name: "Sarah Chen", email: "sarah@nimbuslogistics.com" },
        time: "Apr 1, 11:15 AM",
        body:
          "I pulled our latest numbers against the proposed covenants. At our current revenue run rate, we have about 30% headroom on the 1.25x revenue covenant. The fixed charge coverage ratio of 1.1x is tighter — we're at about 1.3x right now, so not a ton of cushion if we have a bad quarter.\n\nMike, do you think we should try to negotiate the FCCR down to 1.0x?\n\nSarah",
      },
    ],
  },
  {
    id: "t5",
    accountId: "a5",
    subject: "QuickBooks setup — chart of accounts review",
    status: "waiting",
    starred: false,
    lastActivity: "4 days ago",
    lastActivityTs: Date.now() - 345_600_000,
    preview:
      "Here's the draft chart of accounts I put together based on our onboarding call...",
    participants: [
      { name: "Tom Bradley", email: "tom@ridgelinedata.io", role: "CEO / Founder" },
    ],
    messages: [
      {
        id: "m11",
        from: { name: "You", email: "torres@ridgelinedata.io" },
        time: "Mar 31, 2:00 PM",
        body:
          "Tom,\n\nHere's the draft chart of accounts I put together based on our onboarding call. I've organized it to support both your current operations and future reporting needs once you start fundraising.\n\nA few notes:\n- I separated R&D expenses into internal vs. contracted to make it easier to track for potential R&D tax credits\n- Added sub-accounts for each major revenue stream\n- Set up a deferred revenue account for annual contracts\n\nTake a look and let me know if anything seems off.\n\nBest,\nMike",
      },
    ],
  },
  {
    id: "t6",
    accountId: "a1",
    subject: "Re: Weekend plans",
    status: "fyi",
    starred: false,
    lastActivity: "1 day ago",
    lastActivityTs: Date.now() - 90_000_000,
    preview: "Sounds great! We'll meet at the trailhead at 8am Saturday.",
    participants: [
      { name: "Sarah Torres", email: "sarah.torres@gmail.com", role: "" },
    ],
    messages: [
      {
        id: "m12",
        from: { name: "Sarah Torres", email: "sarah.torres@gmail.com" },
        time: "Yesterday, 6:30 PM",
        body:
          "Sounds great! We'll meet at the trailhead at 8am Saturday. Don't forget the sunscreen this time 😄",
      },
    ],
  },
];
