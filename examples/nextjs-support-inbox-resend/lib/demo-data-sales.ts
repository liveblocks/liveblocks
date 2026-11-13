import type { DemoConversation } from "./demo-data";

// Sample conversations seeded into the Sales inbox (sales@relay.example).
// Timestamps are relative (`minutesAgo`) so the inbox always looks current.
// Everything here is fictional.

export const SALES_DEMO_CONVERSATIONS: DemoConversation[] = [
  {
    id: "enterprise-quote-120-seats",
    subject: "Enterprise quote for 120 seats before budget sign-off",
    customer: {
      name: "Ingrid Solberg",
      email: "ingrid@kestrelrobotics.com",
      company: "Kestrel Robotics",
    },
    category: "pricing",
    status: "needs-response",
    priority: "urgent",
    assigneeId: "mislav.abha@relay.example",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 2210,
        text: "Hello Relay sales,\n\nWe have been running Relay on the Growth plan in our \"Factory Intake\" workspace for about seven months with 38 seats. Our manufacturing, QA, and field-service teams now want to standardize on it, which would bring us to roughly 120 seats across four workspaces by February.\n\nCould you send an Enterprise quote for 120 seats on an annual term? We need SSO, the audit log, and at least 12 months of run history. Our budget committee meets on Thursday, so a number before then would let me include it in this cycle rather than the next one.\n\nThe attached summary covers our requirements and the teams involved.\n\nBest regards,\nIngrid\nVP Operations, Kestrel Robotics",
        attachments: [
          { filename: "kestrel-requirements-summary.pdf", size: 262144 },
        ],
      },
      {
        kind: "note",
        minutesAgo: 2150,
        authorId: "charlie.layne@relay.example",
        text: "@Mislav Abha this is yours. Budget committee is Thursday, so we need the quote out before Wednesday afternoon. Volume tier for 120 seats needs a discount approval from me; ping me with the number.",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 1510,
        authorId: "mislav.abha@relay.example",
        text: "Hi Ingrid,\n\nThank you for the summary; it makes the scope very clear. Enterprise covers everything you listed, including SAML SSO, the audit log, 12-month run history, and consolidated billing across the four workspaces.\n\nI am preparing a quote for 120 seats on an annual term with volume pricing, and I expect to send it tomorrow morning. One question so I get the numbers right: should the quote also include a ramp option, where you start at your current 38 seats and move to 120 in February, or would you prefer the full 120 from the start date?\n\n— Mislav\nRelay Sales",
      },
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 6,
        text: "Hi Mislav,\n\nA ramp option would be ideal, since the field-service team will not onboard until February. Please show both versions if that is possible, so the committee can compare the full-year cost.\n\nOne more thing: our finance team has asked whether the annual payment can be split into two invoices, one in January and one in July. If that changes the pricing, please note it on the quote. The committee meeting is at 10 AM CET on Thursday.\n\nThank you,\nIngrid",
      },
    ],
  },
  {
    id: "trial-extension-pilot",
    subject: "Extending our trial for a second pilot team",
    customer: {
      name: "Rafael Mendoza",
      email: "rafael@cobaltharvest.co",
      company: "Cobalt Harvest",
    },
    category: "trial",
    status: "needs-response",
    priority: "normal",
    assigneeId: "tatum.paolo@relay.example",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 310,
        text: "Hi there,\n\nOur 14-day trial of Relay ends on Friday. The agronomy team built a \"Soil Sample Routing\" workflow during the first week and it is working well, but our logistics team only got access two days ago and has not had time to try the webhook steps they care about.\n\nWould it be possible to extend the trial by another two weeks so logistics can run a proper pilot? We are serious about buying, but I would like both teams to sign off before I take a proposal to our director.\n\nThanks,\nRafael\nHead of Field Operations, Cobalt Harvest",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 184,
        authorId: "tatum.paolo@relay.example",
        text: "Hi Rafael,\n\nHappy to help. I have extended the trial on your workspace by 14 days, so it now ends on the 28th. Nothing changes for the agronomy team; their workflow and run history stay exactly as they are.\n\nIf it would help the logistics pilot, I can set up a 30-minute session with one of our solutions engineers to walk through webhook steps and retry behavior. Let me know a couple of times that work and how many people would join.\n\n— Tatum\nRelay Sales",
      },
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 42,
        text: "Hi Tatum,\n\nThank you, the extension is showing in the workspace already. A session would be great. The logistics lead and two coordinators could join on Tuesday at 2 PM or Wednesday at 10 AM, Mountain time.\n\nAlso, is there a way to invite three more people to the trial without them counting toward a seat limit? The trial banner says 10 seats and we are at 9.\n\nBest,\nRafael",
      },
    ],
  },
  {
    id: "soc2-security-questionnaire",
    subject: "Security questionnaire and SOC 2 report request",
    customer: {
      name: "Yuki Nakamura",
      email: "yuki@tidewaterfinancial.com",
      company: "Tidewater Financial",
    },
    category: "security",
    status: "needs-response",
    priority: "high",
    assigneeId: "quinn.elton@relay.example",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 1460,
        text: "Hello,\n\nWe are in the final stage of evaluating Relay for our loan-servicing operations team. Before our risk committee can approve a vendor, we need a completed security questionnaire and a copy of your most recent SOC 2 Type II report.\n\nThe questionnaire is attached. It has 84 questions across access control, encryption, incident response, and subprocessors. We would also like to know whether you support customer-managed encryption keys and how long webhook payloads are retained.\n\nOur target decision date is the end of the month.\n\nKind regards,\nYuki\nThird-Party Risk Analyst, Tidewater Financial",
        attachments: [
          { filename: "security-questionnaire-2026.xlsx", size: 97812 },
        ],
      },
      {
        kind: "note",
        minutesAgo: 1398,
        authorId: "quinn.elton@relay.example",
        text: "@Charlie Layne they need the SOC 2 Type II under NDA. Can you send the mutual NDA from the legal folder so I can share the report? I will start on the questionnaire; most answers are in the trust page bank.",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 965,
        authorId: "quinn.elton@relay.example",
        text: "Hi Yuki,\n\nThank you for sending the questionnaire. I have started working through it and expect to return the completed spreadsheet within three business days. Where a question needs a longer answer, I will attach the relevant policy excerpt rather than summarize it.\n\nOur SOC 2 Type II report is shared under a mutual NDA. My colleague will send the agreement for signature today; once it is countersigned, I will send the report along with the bridge letter covering the period since the audit.\n\nOn your two questions: customer-managed encryption keys are available on the Enterprise plan, and webhook payloads are retained for 30 days by default, which can be reduced to 7 days on request.\n\n— Quinn\nRelay Sales",
      },
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 123,
        text: "Hi Quinn,\n\nThe NDA has been signed by our legal team and returned this morning, so please send the SOC 2 report and bridge letter whenever you are ready.\n\nTwo follow-ups from our committee: can the 7-day payload retention be enforced at the workspace level rather than requested per workspace, and do you have a current penetration test summary we can include in the file? A one-page summary is sufficient.\n\nThank you,\nYuki",
      },
    ],
  },
  {
    id: "procurement-annual-po",
    subject: "Annual invoicing and purchase order for Enterprise",
    customer: {
      name: "Oluwaseun Adeyemi",
      email: "seun@granitepeakmining.com",
      company: "Granite Peak Mining",
    },
    category: "billing",
    status: "waiting",
    priority: "high",
    assigneeId: "anjali.wanda@relay.example",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 2640,
        text: "Hello Relay,\n\nOur operations group has approved the Enterprise proposal for 75 seats. Procurement now needs to set Relay up as a vendor before we can issue the first payment. I have attached our vendor onboarding form and the purchase order our finance system generated for the first year.\n\nWe pay annual invoices by bank transfer on net-45 terms and cannot pay by card. Please confirm you can invoice against the PO number and let me know your remittance details.\n\nRegards,\nOluwaseun\nProcurement Specialist, Granite Peak Mining",
        attachments: [
          { filename: "vendor-onboarding-form.pdf", size: 341504 },
          { filename: "PO-88213-granite-peak.pdf", size: 128974 },
        ],
      },
      {
        kind: "note",
        minutesAgo: 2590,
        authorId: "anjali.wanda@relay.example",
        text: "PO total matches the signed proposal. Net-45 needs finance sign-off since our standard is net-30; asked them this morning.",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 1920,
        authorId: "anjali.wanda@relay.example",
        text: "Hi Oluwaseun,\n\nThank you for the form and the purchase order. The PO total matches the signed proposal, and we can invoice against PO-88213 for the full annual amount. Bank transfer is fine, and our finance team has approved net-45 terms for this agreement.\n\nI have completed the vendor onboarding form and attached it to our reply along with our W-9 and remittance details. The first invoice will be issued once your account is activated, which I can schedule for any date you prefer.\n\n— Anjali\nRelay Sales",
      },
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 1405,
        text: "Hi Anjali,\n\nThanks, the form has been accepted and Relay is now an approved vendor in our system. Please activate the account on the 1st of next month and date the invoice the same day so it lands in the correct fiscal period.\n\nOne request from our accounts payable team: the invoice must show the PO number, our vendor ID GPM-4471, and the billing address exactly as it appears on the form, or it will be rejected automatically.\n\nRegards,\nOluwaseun",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 1160,
        authorId: "anjali.wanda@relay.example",
        text: "Hi Oluwaseun,\n\nAll set. Activation is scheduled for the 1st, and the invoice will be dated the same day with PO-88213, vendor ID GPM-4471, and the billing address copied directly from the onboarding form. I have added those fields to your billing profile so future renewals carry them automatically.\n\nI will send a preview of the invoice two days before it is issued so your accounts payable team can check it before it enters their queue.\n\n— Anjali\nRelay Sales",
      },
    ],
  },
  {
    id: "reseller-partnership-nordics",
    subject: "Reseller partnership for the Nordic region",
    customer: {
      name: "Katrin Lindqvist",
      email: "katrin@fjordlinesystems.no",
      company: "Fjordline Systems",
    },
    category: "partnership",
    status: "needs-response",
    priority: "normal",
    assigneeId: "",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 1345,
        text: "Hello Relay team,\n\nFjordline Systems is a systems integrator working with around 60 mid-sized logistics and energy companies in Norway, Sweden, and Denmark. Several of our clients have asked us to automate approval and alerting processes, and Relay has come up repeatedly as the tool they would like to use.\n\nDo you have a reseller or referral partner program? We would be interested in reselling Enterprise subscriptions, delivering implementation services, and acting as first-line support in local languages. If you have a partner deck or standard terms, I would be glad to review them.\n\nBest regards,\nKatrin\nPartnerships Director, Fjordline Systems",
      },
      {
        kind: "note",
        minutesAgo: 1290,
        authorId: "charlie.layne@relay.example",
        text: "Partner program is not public yet, but this is the kind of integrator we want. Leaving unassigned until we decide whether @Quinn Elton or Mislav owns partner conversations this quarter.",
      },
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 37,
        text: "Hi again,\n\nJust following up on my note from yesterday. Two of our clients are starting projects in January, so it would help to know whether a partner arrangement is realistic on that timeline or whether they should buy directly for now.\n\nHappy to jump on a call if that is easier.\n\nBest,\nKatrin",
      },
    ],
  },
  {
    id: "growth-vs-enterprise-limits",
    subject: "Comparing Growth and Enterprise plan limits",
    customer: {
      name: "Benedikt Haas",
      email: "benedikt@alpenwerkmedia.de",
      company: "Alpenwerk Media",
    },
    category: "pricing",
    status: "waiting",
    priority: "normal",
    assigneeId: "charlie.layne@relay.example",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 2470,
        text: "Hi,\n\nWe are deciding between the Growth and Enterprise plans for our editorial operations team. The pricing page lists seat counts but is less specific about usage limits. We expect around 40 seats, 60,000 workflow runs per month, and roughly 250,000 webhook deliveries per month, with peaks during live events.\n\nWhich of these limits would push us onto Enterprise? We also need to know whether Growth includes any uptime commitment, and what happens to runs that exceed the monthly allowance.\n\nThanks,\nBenedikt\nHead of Editorial Technology, Alpenwerk Media",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 2015,
        authorId: "charlie.layne@relay.example",
        text: "Hi Benedikt,\n\nGood questions. Growth includes up to 50 seats and 25,000 workflow runs per month, with additional runs billed in blocks of 10,000. Runs are never dropped when you exceed the allowance; the overage simply appears on the next invoice. Webhook deliveries are not metered separately on either plan.\n\nAt 60,000 runs per month, Growth with overage would cost more than Enterprise at your seat count, and Enterprise also adds a 99.9% uptime SLA, SSO, and priority support, which matter during live events. I have attached a side-by-side comparison using your numbers, including a peak month at double volume.\n\nIf you would like, I can walk through it on a call with your team next week.\n\n— Charlie\nRelay Sales",
      },
    ],
  },
  {
    id: "team-demo-request",
    subject: "Product demo for our compliance team",
    customer: {
      name: "Aisha Rahman",
      email: "aisha@saffronroutelogistics.com",
      company: "Saffron Route Logistics",
    },
    category: "trial",
    status: "waiting",
    priority: "low",
    assigneeId: "",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 4330,
        text: "Hello,\n\nI lead a compliance team of eight at Saffron Route Logistics, and we are looking for a tool to automate our customs document checks. A colleague at another company recommended Relay.\n\nCould we arrange a demo for the team? We would like to see how conditional steps and approvals work, and whether a workflow can wait for a document to arrive before continuing. Most of us are based in Dubai, so a morning slot in Gulf Standard Time would suit us best.\n\nThank you,\nAisha\nCompliance Manager, Saffron Route Logistics",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 3905,
        authorId: "tatum.paolo@relay.example",
        text: "Hi Aisha,\n\nWe would be glad to show you Relay. Conditional steps, approvals, and waiting on an external event such as a document upload are all core features, so we can build a customs-check example live during the session.\n\nI have two morning slots available in Gulf Standard Time: Tuesday at 10 AM or Thursday at 9:30 AM. The demo takes about 45 minutes, including time for questions. Let me know which works, and I will send a calendar invitation to your team.\n\n— Tatum\nRelay Sales",
      },
    ],
  },
  {
    id: "eu-data-residency",
    subject: "EU data residency for a regulated workload",
    customer: {
      name: "Pieter van der Berg",
      email: "pieter@dunegatepharma.nl",
      company: "Dunegate Pharma",
    },
    category: "security",
    status: "resolved",
    priority: "normal",
    assigneeId: "quinn.elton@relay.example",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 7920,
        text: "Dear Relay team,\n\nWe are considering Relay for a clinical-supply tracking workflow that will process personal data of trial participants in the Netherlands and Germany. Our data protection officer requires that all data, including run history, attachments, and backups, stay within the European Union.\n\nCan you confirm which regions are available, whether support staff outside the EU can access workspace data, and whether you will sign a data processing agreement with standard contractual clauses?\n\nMet vriendelijke groet,\nPieter\nIT Director, Dunegate Pharma",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 7310,
        authorId: "quinn.elton@relay.example",
        text: "Hi Pieter,\n\nYes on all three points. Enterprise workspaces can be created in our EU region, hosted in Frankfurt with backups replicated to Dublin. Run history, attachments, webhook payloads, and logs for an EU workspace are stored only in those two locations.\n\nSupport access to EU workspace data is restricted to staff located in the EU and requires a time-limited approval that is recorded in your audit log. Our data processing agreement includes the standard contractual clauses and a current subprocessor list, and we sign it as part of the Enterprise agreement.\n\nI have attached the DPA and the regional architecture overview for your data protection officer.\n\n— Quinn\nRelay Sales",
      },
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 6815,
        text: "Hi Quinn,\n\nThank you, our data protection officer has reviewed the DPA and the architecture overview and is satisfied. The only remaining question was whether the EU region can be selected during workspace creation or must be requested, and your colleague on the trial confirmed it is a simple selection.\n\nWe will proceed with the Enterprise proposal through our procurement team. Please consider the residency question closed.\n\nMet vriendelijke groet,\nPieter",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 6520,
        authorId: "quinn.elton@relay.example",
        text: "Hi Pieter,\n\nThat is good news, and I am glad the documents answered everything. I have marked this question as resolved and noted on your account that the workspace should be created in the EU region at activation.\n\nI will hand the proposal over to Anjali, who handles procurement and invoicing, and she will be in touch with your team directly.\n\n— Quinn\nRelay Sales",
      },
    ],
  },
  {
    id: "lost-deal-feedback",
    subject: "Why we went with another option",
    customer: {
      name: "Grace Mbeki",
      email: "grace@lanternhillstudios.com",
      company: "Lanternhill Studios",
    },
    category: "feedback",
    status: "resolved",
    priority: "low",
    assigneeId: "mislav.abha@relay.example",
    messages: [
      {
        kind: "email",
        direction: "inbound",
        minutesAgo: 13910,
        text: "Hi Mislav,\n\nI wanted to close the loop after our calls last month. We have decided not to move forward with Relay for now. The product was the strongest we evaluated, and the team especially liked the run timeline and the approval steps.\n\nThe deciding factor was pricing structure. Our studio has 60 occasional users who would each run a workflow a few times a month, and per-seat pricing made the Growth plan cost more than a usage-based alternative. A lower-priced seat for people who only trigger workflows and approve steps would have changed the outcome.\n\nI hope this is useful, and we may revisit next year.\n\nBest,\nGrace\nStudio Operations Lead, Lanternhill Studios",
      },
      {
        kind: "note",
        minutesAgo: 13520,
        authorId: "mislav.abha@relay.example",
        text: "Lost on per-seat pricing for occasional users. Third time this quarter a light-seat tier would have won the deal; added to the win-loss sheet and the pricing review doc.",
      },
      {
        kind: "email",
        direction: "outbound",
        minutesAgo: 13205,
        authorId: "mislav.abha@relay.example",
        text: "Hi Grace,\n\nThank you for taking the time to explain the decision; feedback this specific is genuinely useful. You are not the first team to describe a split between people who build workflows and people who only trigger or approve them, and I have shared your example with the pricing team as part of that review.\n\nIf we introduce a lighter seat type for occasional users, I will reach out to you first. In the meantime, I wish the studio a smooth launch with whichever option you chose.\n\n— Mislav\nRelay Sales",
      },
    ],
  },
];
