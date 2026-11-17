# PR #12: fix the two failing acceptance scenarios

Starting point: the two extra tests in your patch (hidden sign-up box, two Coach screens) are added unchanged to the marketing acceptance file. Campaign sending stays off and the PR stays a draft. Nothing goes live.

## 1. Hidden sign-up box must not record a choice
Today, when the campaign rule lookup is still loading or fails, the box is hidden but email sign-up still sends "no", which records a decline.

- Track whether the box was actually shown to the player (rule lookup finished, collection open, box rendered).
- Only then include the campaign choice in the sign-up request; otherwise send nothing, so the account stays "not asked" with 0 events.
- Covers both the slow lookup and the failed lookup. Same rule for the Google sign-up path: no consent call when its box was never shown.
- The visible box keeps today's behaviour (optional, unticked, server re-checks collection rules).

## 2. Only one Coach screen gets the first invite
Today both screens read "invite available" before either records the view.

- The server hands out the one invite in a single step: the first read that finds it unclaimed claims it for that session and answers yes; every other read (other device, later reads) answers no.
- The Coach invite appears only after that yes answer; the device that got it keeps it until the player answers or leaves.
- Recording "shown" becomes a harmless repeat. Claiming the invite never creates a consent event.
