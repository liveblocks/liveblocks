import type { Category, Priority, Status } from "./conversation";

// Sample conversations seeded into the demo inbox. Timestamps are relative
// (`minutesAgo`) so the inbox always looks current. Everything here is
// fictional.

export type DemoAttachment = { filename: string; size: number };

export type DemoMessage =
  | {
      kind: "email";
      direction: "inbound" | "outbound";
      minutesAgo: number;
      text: string;
      // Agent id for outbound emails.
      authorId?: string;
      attachments?: DemoAttachment[];
    }
  | {
      kind: "note";
      minutesAgo: number;
      authorId: string;
      text: string;
    };

export type DemoConversation = {
  // Short, stable slug. Used to derive deterministic feed/message ids.
  id: string;
  subject: string;
  customer: { name: string; email: string; company: string };
  category: Category;
  status: Status;
  priority: Priority;
  // Agent id, or "" when unassigned.
  assigneeId: string;
  // Oldest first.
  messages: DemoMessage[];
};

export const DEMO_CONVERSATIONS: DemoConversation[] = [
  {
    id: "duplicate-charge-october",
    subject: "Duplicate charge on October invoice",
    customer: {
      name: "Priya Raman",
      email: "priya@northwindanalytics.com",
      company: "Northwind Analytics",
    },
    category: "billing",
    status: "needs-response",
    priority: "urgent",
    assigneeId: "anjali.wanda@relay.example",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 92,
        text: "Hi Relay team,\n\nOur October Growth plan invoice, INV-2041-0387, appears to include the same $1,440 annual seat adjustment twice. Both line items reference 24 seats in our \"Forecast Ops\" workspace, and the card ending in 4418 was charged for the full total this morning.\n\nCould you confirm whether one charge is a duplicate and reverse it today? Our finance close is tomorrow, so a quick answer would help enormously.\n\nThanks,\nPriya\nFinance Director, Northwind Analytics",
        attachments: [
          { filename: "invoice-INV-2041-0387.pdf", size: 184320 },
        ],
      },
      {
        kind: "note",
        minutesAgo: 74,
        authorId: "charlie.layne@relay.example",
        text: "@Anjali Wanda can you check the invoice ledger? Marking urgent because their close is tomorrow.",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 51,
        authorId: "anjali.wanda@relay.example",
        text: "Hi Priya,\n\nYou are right to flag this. I can see two seat-adjustment entries tied to the same October change, and I have asked our payments processor to hold the second charge while I reconcile the ledger. You do not need to dispute it with your bank.\n\nI will send the credit reference and a corrected invoice as soon as the reversal is confirmed, which should be later today.\n\n— Anjali\nRelay Support",
      },
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 4,
        text: "Hi Anjali,\n\nThank you for checking so quickly. The second charge has moved from pending to posted on our card, so I wanted to make sure you saw that update. Our controller can keep the books open until 4 PM Eastern today.\n\nPlease send the corrected PDF and credit reference when they are available, and let me know if you need a screenshot from the card statement.\n\nBest,\nPriya",
      },
    ],
  },
  {
    id: "api-key-rotation-401",
    subject: "API keys returning 401 after rotation",
    customer: {
      name: "Tomás Oyelaran",
      email: "tomas@ferrisandco.com",
      company: "Ferris & Co.",
    },
    category: "technical",
    status: "needs-response",
    priority: "high",
    assigneeId: "mislav.abha@relay.example",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 185,
        text: "Hello,\n\nWe rotated the production API key for our \"Claims Intake\" workspace at 09:10 UTC. Since then, every request to `POST /v1/workflow-runs` returns `401 invalid_token`. The new key works against the workspace listing endpoint, and the old key now fails everywhere as expected.\n\nWe have confirmed there are no trailing spaces in the secret and restarted all three workers. Could someone check whether run creation is validating against stale credentials?\n\nRegards,\nTomás\nPlatform Engineer, Ferris & Co.",
      },
      {
        kind: "note",
        minutesAgo: 162,
        authorId: "charlie.layne@relay.example",
        text: "@Mislav Abha please compare the token audience on run creation with the workspace endpoint.",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 96,
        authorId: "mislav.abha@relay.example",
        text: "Hi Tomás,\n\nThanks for the precise timeline. I found that the new key was issued for the EU API host, while the workers are sending run requests to the US host. Workspace listing is global, which explains why that check succeeds.\n\nPlease update the base URL to `https://eu.api.relay.example` and retry one request. I am also checking why the key-rotation dialog did not show the regional host clearly.\n\n— Mislav\nRelay Support",
      },
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 17,
        text: "Hi Mislav,\n\nSwitching the base URL fixed run creation in our staging worker, thank you. Before I roll this to production, can you confirm whether the webhook callback IP ranges differ between the EU and US hosts? Our firewall currently allows only the ranges shown on the general API settings page.\n\nIf there is a region-specific list, please point me to it and I can update the rule before deploying.\n\nBest,\nTomás",
      },
    ],
  },
  {
    id: "sso-login-loop",
    subject: "SSO login loops back to sign-in",
    customer: {
      name: "Mei-Ling Duarte",
      email: "mei-ling@brightfieldlabs.io",
      company: "Brightfield Labs",
    },
    category: "account",
    status: "needs-response",
    priority: "high",
    assigneeId: "quinn.elton@relay.example",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 260,
        text: "Hi support,\n\nSix people in our \"Clinical Ops\" workspace are stuck in an SSO loop this morning. After authenticating with our identity provider, Relay briefly shows the workspace, then returns them to `/sign-in?reason=session_expired`. This began after we renewed our SAML certificate on November 8.\n\nI can still enter through a recovery admin account, and the certificate fingerprint in Relay matches our identity provider. Could you help us identify what is invalidating the session?\n\nThank you,\nMei-Ling\nIT Administrator, Brightfield Labs",
      },
      {
        kind: "note",
        minutesAgo: 221,
        authorId: "quinn.elton@relay.example",
        text: "@Charlie Layne the assertion has a 30-second lifetime. Is that below our supported clock-skew window?",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 144,
        authorId: "quinn.elton@relay.example",
        text: "Hi Mei-Ling,\n\nI reviewed the failed assertions and the certificate itself is valid. The identity provider is setting `NotOnOrAfter` only 30 seconds after issuance, while the requests are reaching us about 35 seconds later. That makes the assertion expired before Relay can establish a session.\n\nPlease increase the assertion lifetime to at least three minutes and test with one affected user. I will keep the case open while you make the change.\n\n— Quinn\nRelay Support",
      },
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 38,
        text: "Hi Quinn,\n\nWe increased the assertion lifetime to five minutes. Four people can now sign in, but two still return to the same session-expired page in Chrome 130. Both had attempted many times before the configuration change.\n\nShould they clear a specific Relay cookie, or can you invalidate their existing login attempts from your side? I would prefer not to ask them to clear all browser data if we can avoid it.\n\nThanks,\nMei-Ling",
      },
    ],
  },
  {
    id: "bulk-workflow-export",
    subject: "Request: bulk export of workflow runs",
    customer: {
      name: "Amina Okafor",
      email: "amina@cedarpathhealth.com",
      company: "Cedar Path Health",
    },
    category: "feature-request",
    status: "needs-response",
    priority: "normal",
    assigneeId: "",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 410,
        text: "Hello Relay team,\n\nWe use the Growth plan for our \"Referral Review\" workspace and need to archive completed workflow runs each quarter. At the moment, our operations team opens each run individually to download its results, which is becoming difficult at roughly 8,000 runs per quarter.\n\nCould you add a bulk CSV export filtered by workflow, status, and date range? An API endpoint would also work for us if it included step outcomes and completion timestamps.\n\nWarmly,\nAmina\nOperations Manager, Cedar Path Health",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 275,
        authorId: "tatum.paolo@relay.example",
        text: "Hi Amina,\n\nThank you for explaining the scale and the fields you need. There is not currently a single bulk export for workflow runs, but I have shared your use case with our product team. As a temporary option, the runs API can be paginated by workflow and creation date, then converted to CSV.\n\nI can send a small example script if that would help your team evaluate the workaround.\n\n— Tatum\nRelay Support",
      },
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 150,
        text: "Hi Tatum,\n\nAn example script would be useful, especially if it handles pagination and the API rate limit. We need the export to include failed runs as well as successful ones, and a column for the name of the step that failed.\n\nOur next archive is due on November 30, so even a supported workaround before then would save the team a lot of manual work.\n\nThanks again,\nAmina",
      },
    ],
  },
  {
    id: "webhook-retries-stalled",
    subject: "Webhook retries stop after second attempt",
    customer: {
      name: "Jonas Bergström",
      email: "jonas@harborgrid.se",
      company: "HarborGrid",
    },
    category: "technical",
    status: "waiting",
    priority: "high",
    assigneeId: "mislav.abha@relay.example",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 980,
        text: "Hi Relay support,\n\nOur endpoint returned `503 maintenance_window` for about 12 minutes last night. The delivery log for webhook `wh_7f92a` shows attempts at 22:01 and 22:02 UTC, but no later retries. We expected retries to continue once our endpoint recovered.\n\nThis affected 37 `workflow.completed` events in the \"Port Alerts\" workspace. Is the two-attempt behavior expected, and can those events be replayed without triggering the workflows again?\n\nBest,\nJonas\nEngineering Lead, HarborGrid",
      },
      {
        kind: "note",
        minutesAgo: 842,
        authorId: "mislav.abha@relay.example",
        text: "The delivery worker treated their Retry-After value as an absolute date. Replaying the affected batch after confirmation.",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 620,
        authorId: "mislav.abha@relay.example",
        text: "Hi Jonas,\n\nThis was not expected. Your endpoint sent `Retry-After: 300`, and our delivery worker incorrectly interpreted that value while scheduling the third attempt. We have corrected the queue entries and can replay all 37 events independently of their original workflows.\n\nPlease confirm the endpoint is ready, and I will start the replay. I will also share the event IDs afterward so you can verify that each one arrived once.\n\n— Mislav\nRelay Support",
      },
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 418,
        text: "Hi Mislav,\n\nThe endpoint is healthy now, and we have added temporary logging for the replay. Please go ahead with all 37 events. We deduplicate on the Relay event ID, so an accidental repeat should be safe.\n\nCould you also confirm whether this issue affects other webhooks that returned an integer Retry-After value, or only this batch?\n\nRegards,\nJonas",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 300,
        authorId: "mislav.abha@relay.example",
        text: "Hi Jonas,\n\nThe replay is complete, and all 37 deliveries received a `200` response. I have checked your other webhooks from the past seven days; no additional deliveries were stranded by this scheduling issue.\n\nWe are reviewing the integer Retry-After handling across the delivery service, but there is nothing else you need to replay. I will keep monitoring the corrected batch through today.\n\n— Mislav\nRelay Support",
      },
    ],
  },
  {
    id: "reduce-growth-seats",
    subject: "Reducing Growth plan seats before renewal",
    customer: {
      name: "Leila Haddad",
      email: "leila@orbitandloom.com",
      company: "Orbit & Loom",
    },
    category: "billing",
    status: "waiting",
    priority: "normal",
    assigneeId: "anjali.wanda@relay.example",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 1120,
        text: "Hello,\n\nOur Growth subscription renews on December 1 with 32 seats, but our team will be down to 21 active members by then. The billing page lets me remove users, yet it still previews renewal for all 32 seats.\n\nWhat is the cutoff for reducing the seat commitment, and will removing the eleven unused seats affect workflow ownership or historical audit entries in our \"Campaign Studio\" workspace?\n\nKind regards,\nLeila\nCOO, Orbit & Loom",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 860,
        authorId: "anjali.wanda@relay.example",
        text: "Hi Leila,\n\nYou can reduce the renewal quantity any time before November 30 at 23:59 UTC. Removing members does not change historical audit entries, and workflows they created will remain in the workspace. Any active workflow owned by a removed member should be reassigned so future alerts have a recipient.\n\nI have refreshed the billing preview, which should now show 21 seats after you remove the eleven members. No immediate credit or charge will occur.\n\n— Anjali\nRelay Support",
      },
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 705,
        text: "Hi Anjali,\n\nThe preview now shows 21 seats, so that part looks right. We found three active workflows owned by departing team members and reassigned them to our operations account.\n\nCan you confirm the December invoice will use 21 seats automatically, or is there a separate button to lock in the lower commitment? I do not see a save action on the renewal panel.\n\nThanks,\nLeila",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 540,
        authorId: "anjali.wanda@relay.example",
        text: "Hi Leila,\n\nThe 21-seat quantity is already saved; there is no separate confirmation button. Your December renewal will use that number unless another member is added before the cutoff. I agree the panel should make the saved state clearer, and I have passed that feedback to our billing team.\n\nYou will receive the usual invoice email immediately after renewal.\n\n— Anjali\nRelay Support",
      },
    ],
  },
  {
    id: "new-navigation-feedback",
    subject: "New navigation slows down our triage",
    customer: {
      name: "Darius Cole",
      email: "darius@maplelinefreight.com",
      company: "Mapleline Freight",
    },
    category: "feedback",
    status: "waiting",
    priority: "low",
    assigneeId: "",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 1680,
        text: "Hi team,\n\nI wanted to share candid feedback on the new navigation. Our dispatch coordinators switch between \"Exceptions,\" \"Carrier Intake,\" and the run history dozens of times per shift. Moving workspace workflows behind the expandable menu adds two clicks each time, and the menu collapses whenever they open a run in the same tab.\n\nThe attached screenshot marks the three links we use most. Could the menu remember its state, or could users pin workflows to the sidebar?\n\nThanks for listening,\nDarius\nSystems Manager, Mapleline Freight",
        attachments: [
          { filename: "navigation-click-path.png", size: 438912 },
        ],
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 900,
        authorId: "tatum.paolo@relay.example",
        text: "Hi Darius,\n\nThank you for being direct and for annotating the screenshot. I can see how the collapsing menu compounds across a dispatch shift. I have logged both requests: preserving the expanded state and pinning frequently used workflows.\n\nFor now, opening runs in a new tab will keep the original sidebar state, though I recognize that is only a workaround. I will update you when we have a concrete navigation change to share.\n\n— Tatum\nRelay Support",
      },
    ],
  },
  {
    id: "audit-log-api-request",
    subject: "Audit log API for compliance reviews",
    customer: {
      name: "Sofia Petrescu",
      email: "sofia@vellumsecurity.io",
      company: "Vellum Security",
    },
    category: "feature-request",
    status: "waiting",
    priority: "normal",
    assigneeId: "charlie.layne@relay.example",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 2100,
        text: "Hello Relay team,\n\nWe are evaluating the Scale plan for our security automation group. The in-product audit log covers the events we need, but our compliance process requires exporting member, SSO, API-key, and workflow-permission changes into our internal archive every night.\n\nDo you plan to offer an audit log API or scheduled export? We would need actor, timestamp, source IP, affected resource, and before-and-after values, with at least 12 months of retention.\n\nBest regards,\nSofia\nSecurity Program Manager, Vellum Security",
      },
      {
        kind: "note",
        minutesAgo: 1870,
        authorId: "charlie.layne@relay.example",
        text: "@Tatum Paolo can you add their retention and field requirements to the Scale audit export brief?",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 1300,
        authorId: "charlie.layne@relay.example",
        text: "Hi Sofia,\n\nAn audit log API is on our roadmap, but I cannot give you a firm release date yet. The planned event shape includes the actor, timestamp, IP address, action, and affected resource. Before-and-after values are still being evaluated because some fields may contain sensitive data.\n\nScale workspaces currently retain audit events for 12 months and can request a manual CSV export. I can arrange a sample export so your compliance team can confirm the available fields.\n\n— Charlie\nRelay Support",
      },
    ],
  },
  {
    id: "safari-builder-overlap",
    subject: "Workflow builder controls overlap in Safari",
    customer: {
      name: "Noura Al-Sayegh",
      email: "noura@pinebridgelegal.com",
      company: "Pinebridge Legal",
    },
    category: "technical",
    status: "waiting",
    priority: "normal",
    assigneeId: "",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 3560,
        text: "Hi,\n\nThe condition controls in our \"Matter Intake\" workflow overlap the Save button in Safari 18.1 on macOS 15.1. It happens when a condition has four or more values and the browser window is narrower than about 1,300 pixels. Chrome 130 on the same laptop looks normal.\n\nI attached a screenshot and a CSV containing the condition values from a copied test workflow. Could you suggest a safe workaround? Two coordinators use managed Macs where Safari is the required browser.\n\nThank you,\nNoura\nKnowledge Systems Lead, Pinebridge Legal",
        attachments: [
          { filename: "safari-builder-overlap.png", size: 512804 },
          { filename: "test-condition-values.csv", size: 28672 },
        ],
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 2880,
        authorId: "quinn.elton@relay.example",
        text: "Hi Noura,\n\nI reproduced the overlap in Safari 18.1 using the values you provided. It occurs when Safari calculates the wrapping control height before the side panel finishes opening. Your workflow data is safe, but the hidden Save button makes editing impractical.\n\nUntil the layout fix ships, reducing Safari zoom to 90% or widening the window beyond 1,300 pixels will expose the button. We will let you know as soon as the permanent fix is available.\n\n— Quinn\nRelay Support",
      },
    ],
  },
  {
    id: "vat-invoice-correction",
    subject: "VAT number missing from invoice",
    customer: {
      name: "Elena Rossi",
      email: "elena@lumenforge.it",
      company: "Lumenforge",
    },
    category: "billing",
    status: "resolved",
    priority: "normal",
    assigneeId: "anjali.wanda@relay.example",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 6100,
        text: "Buongiorno,\n\nInvoice INV-2041-0294 for our Starter plan does not show our VAT number, IT09284710961, even though it appears correctly under Billing details. Our accountant cannot book the invoice without that identifier and the registered address, Via delle Rose 18, 20121 Milano.\n\nCould you issue a corrected invoice with both details? No change to the charged amount is needed.\n\nThank you,\nElena\nOffice Manager, Lumenforge",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 5220,
        authorId: "anjali.wanda@relay.example",
        text: "Hi Elena,\n\nI found that the VAT details were added after the invoice draft was created, so they did not carry onto the final PDF. I have regenerated INV-2041-0294 with the VAT number and registered Milan address. The amount and payment date remain unchanged.\n\nYou should receive the corrected PDF by email shortly, and it is also available from Billing history now. Future invoices will use the updated details automatically.\n\n— Anjali\nRelay Support",
      },
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 4710,
        text: "Hi Anjali,\n\nThe corrected invoice arrived and now shows both the VAT number and our full registered address. Our accountant has confirmed that it can be booked, and I also checked that the details appear in the next-invoice preview.\n\nEverything is sorted on our side. Thank you for the quick correction and the clear explanation.\n\nBest,\nElena",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 4320,
        authorId: "anjali.wanda@relay.example",
        text: "Hi Elena,\n\nThat is great to hear. I have marked the invoice correction as resolved, and there is no further action needed from you. The VAT number and address will remain attached to the workspace billing profile for future renewals.\n\nIf your legal entity details change later, update them before the invoice preview date so they appear on the generated PDF.\n\n— Anjali\nRelay Support",
      },
    ],
  },
  {
    id: "admin-2fa-lockout",
    subject: "Admin locked out after phone change",
    customer: {
      name: "Malik Thompson",
      email: "malik@oakandember.co",
      company: "Oak & Ember",
    },
    category: "account",
    status: "resolved",
    priority: "normal",
    assigneeId: "charlie.layne@relay.example",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 8600,
        text: "Hello Relay support,\n\nI replaced my phone yesterday and no longer have access to the authenticator entry for Relay. I am the only admin in our \"Retail Launches\" workspace, and the recovery codes I saved during setup are being reported as already used.\n\nMy email and password still work, but I cannot pass the two-factor prompt. What verification do you need to reset 2FA without risking access to the workspace?\n\nThanks,\nMalik\nOperations Director, Oak & Ember",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 8100,
        authorId: "charlie.layne@relay.example",
        text: "Hi Malik,\n\nI understand the urgency, and we can help without changing any workspace data. For security, I have sent a verification link to the billing contact already on file. Once they approve it, we can disable 2FA for your account and require fresh enrollment at your next sign-in.\n\nPlease do not send identity documents or payment details by email. I will reply here as soon as the billing-contact verification is complete.\n\n— Charlie\nRelay Support",
      },
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 7550,
        text: "Hi Charlie,\n\nOur billing contact completed the verification link a few minutes ago. Please proceed with the reset when you see the confirmation. I will enroll the new phone immediately and store the replacement recovery codes in our company password vault this time.\n\nI appreciate the careful process. Let me know if there is anything else you need from either of us.\n\nBest,\nMalik",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 7200,
        authorId: "charlie.layne@relay.example",
        text: "Hi Malik,\n\nThe verification is complete and your previous 2FA enrollment has been removed. I can see that you successfully signed in and enrolled a new authenticator, so the workspace is secure again.\n\nI have closed this request. Your new recovery codes are valid until used, and you can regenerate the full set from Account security if the stored copy is ever misplaced.\n\n— Charlie\nRelay Support",
      },
    ],
  },
  {
    id: "workflow-launch-feedback",
    subject: "Launch week went smoothly",
    customer: {
      name: "Hanae Mori",
      email: "hanae@silverfernfoods.jp",
      company: "Silver Fern Foods",
    },
    category: "feedback",
    status: "resolved",
    priority: "low",
    assigneeId: "tatum.paolo@relay.example",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 12880,
        text: "Hi Relay team,\n\nWe launched our \"Supplier Approvals\" workflow across six regional teams last week, and it went much more smoothly than our previous spreadsheet process. The webhook status page was especially helpful when one of our internal endpoints was unavailable.\n\nOne small suggestion: could the run timeline display timestamps in the viewer's local timezone? Our Tokyo and Sydney teams currently translate the UTC times when discussing an approval.\n\nThank you for a very solid product,\nHanae\nBusiness Systems Manager, Silver Fern Foods",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 12420,
        authorId: "tatum.paolo@relay.example",
        text: "Hi Hanae,\n\nCongratulations on the launch, and thank you for sharing how it went. I am glad the webhook status page helped during the endpoint interruption.\n\nYour timezone suggestion makes sense for a cross-regional team. I have recorded a request for a viewer-local option while preserving UTC as a workspace preference. For now, hovering over a timeline timestamp shows the browser-local time, which may make those discussions a little easier.\n\n— Tatum\nRelay Support",
      },
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 12140,
        text: "Hi Tatum,\n\nThe hover detail is useful; none of us had noticed it. We shared that tip with the regional leads, and it solves the immediate problem well enough. A persistent local-time option would still be welcome for exported screenshots.\n\nNo further help is needed, so please feel free to close this. We appreciate you passing the suggestion along.\n\nBest,\nHanae",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 12000,
        authorId: "tatum.paolo@relay.example",
        text: "Hi Hanae,\n\nI have closed the conversation and kept the local-time display request linked to your workspace. The note about screenshots is useful context for the product team, since hover details do not help in shared images.\n\nThank you again for taking the time to send both the positive feedback and a specific improvement. I hope the supplier rollout continues just as smoothly.\n\n— Tatum\nRelay Support",
      },
    ],
  },
];
