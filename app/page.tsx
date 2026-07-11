import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  Check,
  ClipboardCheck,
  Code2,
  CreditCard,
  Inbox,
  LogIn,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { RotatingKeyword } from "@/components/RotatingKeyword";

const crooAgentUrl =
  "https://agent.croo.network/agents/53be746a-820c-41c9-8d97-6badd0a76e62";

const checks = [
  "No DNS records needed (SPF, DKIM, ...)",
  "Start in seconds",
  "Setup reply to",
];

const docsSteps = [
  {
    icon: Code2,
    title: "Create order",
    body: "Submit the email request as a structured CAP order with recipient, title, body, sender, and optional reply-to.",
  },
  {
    icon: CreditCard,
    title: "Lock payment",
    body: "CROO locks the agreed pay-per-message amount before Emailify starts the delivery work.",
  },
  {
    icon: ClipboardCheck,
    title: "Receive delivery",
    body: "Emailify processes the order and returns the delivery result or state update to the client.",
  },
  {
    icon: Check,
    title: "Clear settlement",
    body: "When delivery is accepted, CROO clears the order and releases payment automatically.",
  },
];

const pricingItems = [
  {
    label: "Reserve a sender",
    price: "0.1 USDC",
    detail: "Create a ready-to-use sender for your messages.",
  },
  {
    label: "Send a message",
    price: "0.01 USDC",
    detail: "Pay only when Emailify delivers a new email.",
  },
  {
    label: "Receive and check messages",
    price: "Free*",
    detail: "Getting messages through CROO is not totally free, but almost free: only 0.0001 USDC.",
  },
];

const comparisonRows = [
  {
    feature: "Pricing model",
    emailify: "Pay as you go",
    native: "Plans start around $10",
  },
  {
    feature: "Sender setup",
    emailify: "Senders are set up automatically",
    native: "Sender setup is manual",
  },
  {
    feature: "Domain setup",
    emailify: "Send on behalf of the Emailify domain with your desired inbox and no DNS configuration",
    native: "Send on behalf of your domain, with DNS configuration required",
  },
  {
    feature: "Payment",
    emailify: "Wallet with USDC on Base",
    native: "Credit card",
  },
  {
    feature: "Sending surface",
    emailify: "CROO UI or integration",
    native: "API only",
  },
  {
    feature: "Developer path",
    emailify: "CROO SDK",
    native: "Any SMTP library",
  },
  {
    feature: "Inbox access",
    emailify: "Can receive and check emails",
    native: "Only sends emails, with no UI to check received messages",
  },
  {
    feature: "Onboarding speed",
    emailify: "1 inbox in 1 second or 1 order",
    native: "Up to 10 minutes of onboarding",
  },
];

const orderExample = `{
  "action": "send",
  "to": "customer@example.com",
  "from": "binanceSupport@emailify.site",
  "fromName": "Emma Johnson",
  "reply_to": "binanceSupport@emailify.site",
  "title": "Your update is ready",
  "body": "<h1>Emma from Binance support,...</h1>"
}`;

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero-section">
        <Image
          className="hero-art"
          src="/email-infra-hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <div className="hero-overlay" />

        <nav className="nav" aria-label="Primary">
          <a className="brand" href="#">
            <span className="brand-mark">
              <Zap size={18} aria-hidden="true" />
            </span>
            Emailify
          </a>
          <div className="nav-actions">
            <a href="#docs">Docs</a>
            <a href="#pricing">Pricing</a>
            <a href="#signals">Signals</a>
            <a
              className="nav-cta nav-cta-primary"
              href={crooAgentUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Inbox size={16} aria-hidden="true" />
              Get inbox
            </a>
            <a
              className="nav-cta"
              href="/inbox"
            >
              <LogIn size={16} aria-hidden="true" />
              Login
            </a>
            <a className="icon-button" href="#signals" aria-label="Open delivery health">
              <BarChart3 size={18} aria-hidden="true" />
            </a>
          </div>
        </nav>

        <div className="hero-content">
          <div className="hero-copy">
            <div className="eyebrow">
              <ShieldCheck size={16} aria-hidden="true" />
              Instant email delivery through CROO
            </div>
            <h1>
              deliver quickly <RotatingKeyword /> emails
            </h1>
            <p>
              One clean delivery layer for auth, growth, moments, and state changes,
              with routing intelligence that keeps every message moving.
            </p>
            <div className="cta-row">
              <a
                className="primary-cta"
                href={crooAgentUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Start sending
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="secondary-cta" href="#signals">
                View pricing
              </a>
            </div>
            <div className="check-list" aria-label="Setup highlights">
              {checks.map((item) => (
                <div className="check-item" key={item}>
                  <Check size={16} aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="docs-section" id="docs">
        <div className="docs-heading">
          <p className="section-kicker">Croo.network layer</p>
          <h2>Order email delivery through CROO.</h2>
          <p>
            Clients create an order, lock payment, receive the delivery result,
            and let CROO clear settlement automatically through the CAP lifecycle.
          </p>
        </div>

        <div className="docs-grid">
          <div className="docs-steps" aria-label="Quick start steps">
            {docsSteps.map(({ icon: Icon, title, body }) => (
              <div className="doc-step" key={title}>
                <span>
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <strong>{title}</strong>
                  <p>{body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="code-panel" aria-label="CAP order example">
            <div className="code-panel-header">
              <span>CAP order</span>
              <span>JSON</span>
            </div>
            <pre>
              <code>{orderExample}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <div className="pricing-heading">
          <p className="section-kicker">Pricing</p>
          <h2>Usage-based delivery, without provider setup overhead.</h2>
        </div>

        <div className="pricing-layout">
          <div className="pricing-card" aria-label="Emailify pricing">
            {pricingItems.map((item) => (
              <div className="price-line" key={item.label}>
                <div>
                  <span>{item.label}</span>
                  <p>{item.detail}</p>
                </div>
                <strong>
                  {item.price.endsWith("*") ? (
                    <>
                      {item.price.slice(0, -1)}
                      <sup aria-label="pricing note">*</sup>
                    </>
                  ) : (
                    item.price
                  )}
                </strong>
              </div>
            ))}
          </div>

          <div className="comparison-table" aria-label="Emailify and native SMTP provider comparison">
            <div className="comparison-row comparison-head">
              <span>Capability</span>
              <span>Emailify</span>
              <span>Native SMTP providers</span>
            </div>
            {comparisonRows.map((row) => (
              <div className="comparison-row" key={row.feature}>
                <span>{row.feature}</span>
                <span>{row.emailify}</span>
                <span>{row.native}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="signal-band" id="signals" aria-label="Delivery signals">
        <div className="signal">
          <span>Inbox placement</span>
          <strong>98.7%</strong>
        </div>
        <div className="signal">
          <span>Queue latency</span>
          <strong>11 ms</strong>
        </div>
        <div className="signal">
          <span>State webhooks</span>
          <strong>24/7</strong>
        </div>
        <div className="signal">
          <span>Template drift</span>
          <strong>0.2%</strong>
        </div>
      </section>
    </main>
  );
}
