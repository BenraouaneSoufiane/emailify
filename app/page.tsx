import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  Check,
  ClipboardCheck,
  Code2,
  CreditCard,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { RotatingKeyword } from "@/components/RotatingKeyword";

const checks = [
  "No DNS records needed (SPF, DKIM, ...)",
  "Start in seconds",
  "Setup reply to",
];

const docsSteps = [
  {
    icon: Code2,
    title: "Create order",
    body: "Submit the email request as a structured CAP order with recipient, subject, body, and optional reply-to.",
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

const pipelineSteps = [
  {
    title: "Identify",
    body: "Attach the sending agent DID, wallet, and public service profile.",
  },
  {
    title: "Price",
    body: "Use pay-per-message terms so every accepted send has a clear cost.",
  },
  {
    title: "Dispatch",
    body: "POST the message payload with HTML body and optional attachments.",
  },
  {
    title: "Settle",
    body: "Meter the send, release payment, and update verifiable reputation.",
  },
];

const orderExample = `{
  "service": "Email delivery",
  "capability": "email.delivery",
  "inputs": {
    "to": "customer@example.com",
    "reply_to": "support@yourdomain.com",
    "subject": "Your update is ready",
    "body": "<h1>Hello from Emailify</h1>"
  },
  "price": "pay_per_message"
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
            <a href="#pipeline">Pipeline</a>
            <a href="#signals">Signals</a>
            <button className="icon-button" type="button" aria-label="Open delivery health">
              <BarChart3 size={18} aria-hidden="true" />
            </button>
          </div>
        </nav>

        <div className="hero-content">
          <div className="hero-copy">
            <div className="eyebrow">
              <ShieldCheck size={16} aria-hidden="true" />
              Transactional email command center
            </div>
            <h1>
              deliver quicky <RotatingKeyword /> emails
            </h1>
            <p>
              One clean delivery layer for auth, growth, moments, and state changes,
              with routing intelligence that keeps every message moving.
            </p>
            <div className="cta-row">
              <a className="primary-cta" href="#docs">
                Start sending
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="secondary-cta" href="#signals">
                View signals
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

      <section className="pipeline-section" id="pipeline">
        <div>
          <p className="section-kicker">Croo-backed pipeline</p>
          <h2>Email delivery with pay-per-message settlement.</h2>
        </div>
        <div className="pipeline">
          {pipelineSteps.map((step, index) => (
            <div className="pipeline-step" key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
