/**
 * Generic customer replies for demo mode. The "Generate an example response"
 * button in the composer picks one at random and adds it to the conversation
 * as an inbound email, so there is always something new to respond to.
 * They're written to make sense after almost any agent reply.
 */
export const DEMO_CUSTOMER_REPLIES: string[] = [
  "Thanks, that worked. Appreciate the quick turnaround.",
  "Hmm, I tried that but I'm still seeing the same thing. Anything else I can check?",
  "Got it, thank you. Could you confirm once the change is live on our account?",
  "That makes sense. Is there a way to avoid this happening again in future?",
  "Thanks for the update. How long should I expect this to take?",
  "Perfect, I can see it now. You can close this one out.",
  "Sorry, I should have mentioned: this only happens for one of our team members, not everyone.",
  "Thanks. Just to be clear, will we be charged for this month while it's being sorted?",
  "Okay, I've done that. What should I look for next?",
  "Still not working on my end, unfortunately. Happy to send a screen recording if that helps.",
  "Great, thank you! One more question while I have you: can this be changed from the dashboard, or do I need to ask you each time?",
  "Understood. Could you loop in someone from your billing team on this thread?",
  "Thanks, that's helpful. I'll check with the rest of the team and get back to you.",
  "I'm not sure I follow. Could you walk me through the steps one more time?",
  "That fixed it for me, but a colleague is now reporting the same issue. Should they open a separate ticket?",
  "Appreciate it. Can you send over a link to the documentation for this?",
  "This is a bit urgent on our side; we have a customer demo tomorrow morning. Is there any way to speed it up?",
  "Thanks for looking into it. Let me know if you need anything else from me.",
  "I cleared the cache and logged out and back in like you suggested, no change I'm afraid.",
  "Okay, that's what I needed to know. Thanks for confirming.",
  "Could you also apply the same change to our staging workspace?",
  "Hi, just following up on this. Any news?",
  "That's disappointing but I understand. Is there a workaround in the meantime?",
  "Thank you! Really appreciate how quickly you got back to me.",
  "Just tested again after your change and everything looks good now.",
  "Would it be possible to get this on a call? It might be quicker to show you.",
  "Thanks. For context, we're on the Growth plan if that changes anything.",
  "I've forwarded this to our IT team; they may reply here directly.",
  "Noted. Please keep this ticket open until we've verified it on our side.",
  "All sorted, thanks again for your help with this.",
];

export function randomDemoReply() {
  return DEMO_CUSTOMER_REPLIES[
    Math.floor(Math.random() * DEMO_CUSTOMER_REPLIES.length)
  ];
}
