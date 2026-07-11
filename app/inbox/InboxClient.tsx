"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Inbox, Loader2, Lock, LogOut, Mail, RefreshCw } from "lucide-react";

type Message = {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  preview: string;
  body: string;
};

type InboxSession = {
  address: string;
  name: string;
};

const REMEMBERED_INBOX_KEY = "emailify:remembered-inbox";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isSafeHref(value: string) {
  return value.startsWith("https://") || value.startsWith("http://") || value.startsWith("mailto:");
}

function trimTrailingUrlPunctuation(value: string) {
  const match = value.match(/^(.+?)([.,!?;:)]*)$/);

  return {
    href: match?.[1] || value,
    trailing: match?.[2] || "",
  };
}

function renderInlineMarkdown(value: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const tokenPattern =
    /(\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\))|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|((?:https?:\/\/|mailto:)[^\s<>()]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(value))) {
    if (match.index > lastIndex) {
      nodes.push(value.slice(lastIndex, match.index));
    }

    if (match[2] && match[3] && isSafeHref(match[3])) {
      nodes.push(
        <a href={match[3]} key={`${keyPrefix}-link-${match.index}`} rel="noreferrer" target="_blank">
          {match[2]}
        </a>,
      );
    } else if (match[5]) {
      nodes.push(<code key={`${keyPrefix}-code-${match.index}`}>{match[5]}</code>);
    } else if (match[7]) {
      nodes.push(<strong key={`${keyPrefix}-strong-${match.index}`}>{match[7]}</strong>);
    } else if (match[9]) {
      nodes.push(<em key={`${keyPrefix}-em-${match.index}`}>{match[9]}</em>);
    } else if (match[10]) {
      const { href, trailing } = trimTrailingUrlPunctuation(match[10]);

      nodes.push(
        <a href={href} key={`${keyPrefix}-url-${match.index}`} rel="noreferrer" target="_blank">
          {href}
        </a>,
      );

      if (trailing) {
        nodes.push(trailing);
      }
    }

    lastIndex = tokenPattern.lastIndex;
  }

  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex));
  }

  return nodes;
}

function renderMarkdown(value: string) {
  const lines = (value || "(empty message)").split("\n");
  const blocks: ReactNode[] = [];
  let listItems: ReactNode[][] = [];

  function flushList(key: string) {
    if (listItems.length === 0) {
      return;
    }

    blocks.push(
      <ul key={key}>
        {listItems.map((item, index) => (
          <li key={`${key}-${index}`}>{item}</li>
        ))}
      </ul>,
    );
    listItems = [];
  }

  lines.forEach((line, index) => {
    const listMatch = line.match(/^\s*[-*]\s+(.+)$/);

    if (listMatch) {
      listItems.push(renderInlineMarkdown(listMatch[1], `li-${index}`));
      return;
    }

    flushList(`list-${index}`);

    if (!line.trim()) {
      blocks.push(<br key={`br-${index}`} />);
      return;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);

    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = renderInlineMarkdown(headingMatch[2], `h-${index}`);

      if (level === 1) {
        blocks.push(<h3 key={`h-${index}`}>{content}</h3>);
      } else if (level === 2) {
        blocks.push(<h4 key={`h-${index}`}>{content}</h4>);
      } else {
        blocks.push(<h5 key={`h-${index}`}>{content}</h5>);
      }
      return;
    }

    blocks.push(<p key={`p-${index}`}>{renderInlineMarkdown(line, `p-${index}`)}</p>);
  });

  flushList("list-end");

  return blocks;
}

export function InboxClient() {
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [session, setSession] = useState<InboxSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedId) || messages[0],
    [messages, selectedId],
  );

  const loadInbox = useCallback(async (credentials: { address: string; password: string }, shouldRemember: boolean) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/inbox/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          address: credentials.address,
          password: credentials.password,
        }),
      });
      const body = await response.json();

      if (!response.ok || body.ok === false) {
        throw new Error(body.error || "Login failed.");
      }

      setSession(body.inbox);
      setMessages(body.messages);
      setSelectedId(body.messages[0]?.id || null);

      if (shouldRemember) {
        window.localStorage.setItem(REMEMBERED_INBOX_KEY, JSON.stringify(credentials));
      } else {
        window.localStorage.removeItem(REMEMBERED_INBOX_KEY);
      }
    } catch (loginError) {
      setSession(null);
      setMessages([]);
      setSelectedId(null);
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const remembered = window.localStorage.getItem(REMEMBERED_INBOX_KEY);

    if (!remembered) {
      return;
    }

    try {
      const credentials = JSON.parse(remembered) as { address?: string; password?: string };

      if (credentials.address && credentials.password) {
        setAddress(credentials.address);
        setPassword(credentials.password);
        setRememberMe(true);
        void loadInbox(credentials as { address: string; password: string }, true);
      }
    } catch {
      window.localStorage.removeItem(REMEMBERED_INBOX_KEY);
    }
  }, [loadInbox]);

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadInbox({ address, password }, rememberMe);
  }

  function refreshInbox() {
    void loadInbox({ address, password }, rememberMe);
  }

  function logout() {
    window.localStorage.removeItem(REMEMBERED_INBOX_KEY);
    setSession(null);
    setMessages([]);
    setSelectedId(null);
    setPassword("");
    setRememberMe(false);
    setError("");
  }

  return (
    <main className="mailbox-shell">
      <header className="mailbox-topbar">
        <a className="mailbox-brand" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          Emailify
        </a>
        {session ? (
          <div className="mailbox-actions">
            <button className="mailbox-icon-button" type="button" onClick={refreshInbox} disabled={loading}>
              {loading ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <RefreshCw size={17} aria-hidden="true" />}
              Refresh
            </button>
            <button className="mailbox-icon-button" type="button" onClick={logout}>
              <LogOut size={17} aria-hidden="true" />
              Logout
            </button>
          </div>
        ) : null}
      </header>

      {!session ? (
        <section className="login-panel" aria-label="Inbox login">
          <div className="login-heading">
            <span>
              <Inbox size={18} aria-hidden="true" />
            </span>
            <h1>Inbox login</h1>
            <p>Use the reserved Emailify address and password created through CROO.</p>
          </div>

          <form className="login-form" onSubmit={submitLogin}>
            <label>
              <span>Emailify address</span>
              <input
                autoComplete="email"
                inputMode="email"
                name="address"
                onChange={(event) => setAddress(event.target.value)}
                placeholder="sales@emailify.site"
                required
                type="email"
                value={address}
              />
            </label>
            <label>
              <span>Password</span>
              <input
                autoComplete="current-password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <label className="remember-row">
              <input
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                type="checkbox"
              />
              <span>Remember me</span>
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="primary-cta mailbox-submit" disabled={loading} type="submit">
              {loading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Lock size={18} aria-hidden="true" />}
              Login
            </button>
          </form>
        </section>
      ) : (
        <section className="mailbox-app" aria-label={`${session.address} mailbox`}>
          <aside className="message-list" aria-label="Messages">
            <div className="mailbox-title">
              <span>{session.name}</span>
              <strong>{session.address}</strong>
            </div>
            {messages.length === 0 ? (
              <div className="empty-inbox">
                <Mail size={28} aria-hidden="true" />
                <p>No received messages yet.</p>
              </div>
            ) : (
              messages.map((message) => (
                <button
                  className={`message-row${message.id === selectedMessage?.id ? " active" : ""}`}
                  key={message.id}
                  onClick={() => setSelectedId(message.id)}
                  type="button"
                >
                  <span>{message.from}</span>
                  <strong>{message.subject}</strong>
                  <small>{formatDate(message.date)}</small>
                  <p>{message.preview}</p>
                </button>
              ))
            )}
          </aside>

          <article className="message-view" aria-label="Selected message">
            {selectedMessage ? (
              <>
                <div className="message-header">
                  <span>{formatDate(selectedMessage.date)}</span>
                  <h2>{selectedMessage.subject}</h2>
                  <p>From {selectedMessage.from}</p>
                  {selectedMessage.to ? <p>To {selectedMessage.to}</p> : null}
                </div>
                <div className="message-body">{renderMarkdown(selectedMessage.body || selectedMessage.preview || "(empty message)")}</div>
              </>
            ) : (
              <div className="empty-message">
                <Mail size={34} aria-hidden="true" />
                <p>Select a message to read it.</p>
              </div>
            )}
          </article>
        </section>
      )}
    </main>
  );
}
