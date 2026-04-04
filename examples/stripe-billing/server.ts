/**
 * Stripe Billing Server for Swarm Spawner Pro Tier
 *
 * This is a reference implementation — deploy as a standalone service.
 * NOT part of the npm package. Runs on YOUR infrastructure.
 *
 * Flow:
 *   1. Customer visits /checkout → redirected to Stripe Checkout
 *   2. Stripe charges $49/mo → webhook fires
 *   3. Webhook handler generates HMAC-signed license key
 *   4. Customer receives key via email or dashboard
 *   5. Customer passes key to SwarmSpawner({ licenseKey }) → Pro unlocked
 *
 * Setup:
 *   1. npm install stripe express
 *   2. Create a Stripe product + $49/mo price in Dashboard
 *   3. Generate PQC key pair: npx tsx -e "import{LicenseManager}from'@taurus-ai/swarm-spawner';const kp=LicenseManager.generateKeyPair();console.log('PUBLIC='+Buffer.from(kp.publicKey).toString('hex'));console.log('SECRET='+Buffer.from(kp.secretKey).toString('hex'))"
 *   4. Set env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PQC_LICENSE_PUBLIC_KEY, PQC_LICENSE_SECRET_KEY
 *   5. Run: npx tsx examples/stripe-billing/server.ts
 *   5. Expose webhook endpoint via ngrok or deploy
 *
 * Env vars:
 *   STRIPE_SECRET_KEY       — sk_test_... or sk_live_...
 *   STRIPE_WEBHOOK_SECRET   — whsec_... (from Stripe Dashboard → Webhooks)
 *   STRIPE_PRICE_ID         — price_... (your $49/mo price)
 *   PQC_LICENSE_SECRET_KEY  — ML-DSA-65 secret key (hex, 8064 chars)
 *   PQC_LICENSE_PUBLIC_KEY  — ML-DSA-65 public key (hex, 3904 chars)
 *   PORT                    — Server port (default 3456)
 */

// NOTE: This file is a reference example, not compiled with the package.
// To run it, install: npm install stripe express @types/express

import Stripe from "stripe";
import express from "express";
import { LicenseManager } from "@taurus-ai/swarm-spawner";

// --- Config ---

const STRIPE_SECRET_KEY = process.env["STRIPE_SECRET_KEY"]!;
const STRIPE_WEBHOOK_SECRET = process.env["STRIPE_WEBHOOK_SECRET"]!;
const STRIPE_PRICE_ID = process.env["STRIPE_PRICE_ID"]!;
const PQC_SECRET_KEY = process.env["PQC_LICENSE_SECRET_KEY"]!;
const PQC_PUBLIC_KEY = process.env["PQC_LICENSE_PUBLIC_KEY"]!;
const PORT = parseInt(process.env["PORT"] ?? "3456", 10);

if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !PQC_SECRET_KEY || !PQC_PUBLIC_KEY) {
  console.error("Missing required env vars. See file header for setup.");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);
// ML-DSA-65 signed license keys — quantum-safe, asymmetric
const licenseManager = LicenseManager.fromHex(PQC_PUBLIC_KEY, PQC_SECRET_KEY);
const app = express();

// --- In-memory license store (replace with DB in production) ---

const licenses = new Map<string, { key: string; tier: string; org: string }>();

// --- Routes ---

/**
 * POST /checkout — Create a Stripe Checkout Session for Pro tier.
 * Body: { email: string, org: string }
 */
app.post("/checkout", express.json(), async (req, res) => {
  const { email, org } = req.body as { email?: string; org?: string };

  if (!email || !org) {
    res.status(400).json({ error: "email and org are required" });
    return;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    metadata: { org },
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `http://localhost:${PORT}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `http://localhost:${PORT}/pricing`,
  });

  res.json({ url: session.url });
});

/**
 * POST /webhook — Stripe webhook handler.
 * Must use raw body for signature verification.
 */
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"] as string,
        STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      res.status(400).send("Webhook signature verification failed");
      return;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const org = session.metadata?.["org"] ?? "unknown";
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        // Generate license key
        const licenseKey = licenseManager.generate({
          tier: "pro",
          org,
          durationDays: 35, // 30 days + 5 day grace period
          features: ["pqc-signing", "mainnet", "all-model-tiers"],
          stripeSubscriptionId: subscriptionId,
        });

        // Store (replace with DB in production)
        licenses.set(session.customer_email ?? org, {
          key: licenseKey,
          tier: "pro",
          org,
        });

        console.log(`Pro license generated for ${org}: ${licenseKey.slice(0, 20)}...`);

        // TODO: Send license key to customer via email (SendGrid, Resend, etc.)
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;

        if (subscriptionId) {
          // Renewal — generate fresh license key
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const org = sub.metadata?.["org"] ?? "unknown";

          const licenseKey = licenseManager.generate({
            tier: "pro",
            org,
            durationDays: 35,
            features: ["pqc-signing", "mainnet", "all-model-tiers"],
            stripeSubscriptionId: subscriptionId,
          });

          licenses.set(org, { key: licenseKey, tier: "pro", org });
          console.log(`Pro license renewed for ${org}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const org = sub.metadata?.["org"] ?? "unknown";
        licenses.delete(org);
        console.log(`Subscription cancelled for ${org} — license revoked`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(
          `Payment failed for ${invoice.customer_email ?? "unknown"}. ` +
            "Stripe will retry automatically (dunning).",
        );
        break;
      }

      default:
        // Unhandled event type — log and move on
        break;
    }

    res.json({ received: true });
  },
);

/**
 * GET /license/:org — Retrieve license key for an org.
 * In production, this would be behind authentication.
 */
app.get("/license/:org", (req, res) => {
  const entry = licenses.get(req.params["org"]!);
  if (!entry) {
    res.status(404).json({ error: "No active license for this org" });
    return;
  }
  res.json({ licenseKey: entry.key, tier: entry.tier });
});

/**
 * GET /success — Post-checkout success page.
 */
app.get("/success", async (req, res) => {
  const sessionId = req.query["session_id"] as string;
  if (!sessionId) {
    res.send("Missing session_id");
    return;
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const org = session.metadata?.["org"] ?? "unknown";
  const entry = licenses.get(session.customer_email ?? org);

  res.send(`
    <h1>Welcome to Swarm Spawner Pro!</h1>
    <p>Your license key:</p>
    <pre style="background:#1a1a2e;color:#0ff;padding:16px;border-radius:8px;overflow-x:auto">${entry?.key ?? "(processing — check back in a moment)"}</pre>
    <p>Add it to your config:</p>
    <pre style="background:#1a1a2e;color:#0f0;padding:16px;border-radius:8px">
const spawner = new SwarmSpawner({
  licenseKey: "${entry?.key?.slice(0, 30) ?? "..."}...",
  executor: yourExecutor,
});</pre>
  `);
});

// --- Start ---

app.listen(PORT, () => {
  console.log(`Swarm Spawner Billing Server running on http://localhost:${PORT}`);
  console.log(`  POST /checkout     — Create checkout session`);
  console.log(`  POST /webhook      — Stripe webhook handler`);
  console.log(`  GET  /license/:org — Retrieve license key`);
});
