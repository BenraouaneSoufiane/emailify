# Emailify Mail Operations

## Endpoints

All A2MCP-facing endpoints accept `POST` JSON bodies.

- `/api/a2mcp`
  - Single public Agent Service Provider endpoint for OKX.AI registration.
  - Accepts any supported action shape below, infers the action, and returns `{ ok, action, result }`.
- `/api/a2mcp/newTemplate`
  - `description` string, required
  - `imageUrl` string, optional
  - Sends `description` and `imageUrl` to Venice.ai for template generation
  - Returns `{ ok, html, response, model }`
- `/api/a2mcp/reserveSender`
  - `username` string, required
  - `name` string, required
  - `password` string, required. Keep this password; it is used to send from the reserved address and can be reused for inbox login.
  - Creates `username@emailify.site` under `EMAILIFY_SENDER_ROOT`
  - Returns `{ ok, sender }`
- `/api/a2mcp/send`
  - `to` string, required
  - `title` string, required
  - `body` string, required, HTML accepted
  - `from` string, required sender address
  - `fromName` or `from_name` string, required display name
  - `password` string, required only when `from` matches an existing reserved sender.
  - `reply_to` or `replyTo` string, optional
  - `attachment` or `attachement`, optional. Use a URL/path string, an object with `url`, `path`, or base64 `content`, or an array of those.
- `/api/a2mcp/checkInbox`
  - `username` string, required. May be the reserved username, such as `sales`, or the full reserved address.
  - `address` string, optional alias for `username`
  - `password` string, required
  - Returns `{ ok, inbox, messages }`, where each message has `id`, `from`, `to`, `subject`, `date`, `preview`, and `body`.
- `/api/inbox/login`
  - `address` string, required reserved Emailify address
  - `password` string, required
  - Returns `{ ok, inbox, messages }` for the local `/inbox` mailbox page.

## Environment

```sh
EMAILIFY_DOMAIN=emailify.site
EMAILIFY_FROM="Emailify <no-reply@emailify.site>"
EMAILIFY_SENDER_ROOT=/var/mail/emailify/senders
EMAILIFY_POSTFIX_VIRTUAL_MAP=/var/mail/emailify/virtual_mailbox_maps
SENDMAIL_PATH=/usr/sbin/sendmail
VENICE_API_KEY=replace_with_your_venice_api_key
VENICE_MODEL=zai-org-glm-5-1
```

## OKX.AI Agent Service Provider

Register Emailify as an OKX.AI Agent Service Provider with service type **API service** and the public endpoint:

```txt
https://YOUR_PUBLIC_HOST/api/a2mcp
```

The endpoint must be public `https://` before registration. Localhost, private IPs, and placeholder domains are rejected by the OKX.AI identity flow.

Suggested service listing fields:

```txt
Name: Email Delivery API
Description:
Emailify sends templated or direct email for apps and agents, with sender reservation and inbox checks.
Provide action, recipient/sender fields, message content, and reserved sender password when needed.
Type: API service
Fee: 0.01
Endpoint: https://YOUR_PUBLIC_HOST/api/a2mcp
```

Run locally:

```sh
npm run dev
```

For the build version:

```sh
npm run build
npm run start
```

You can test the A2MCP adapter against a running app:

```sh
npm run a2mcp:provider -- '{"action":"newTemplate","description":"Launch email for a summer sale","imageUrl":"https://example.com/banner.png"}'
```

Supported request shapes:

```json
{"action":"newTemplate","description":"Launch email for a summer sale","imageUrl":"https://example.com/banner.png"}
```

```json
{"action":"reserveSender","username":"sales","name":"Sales Team","password":"keep-this-secret"}
```

```json
{"action":"send","to":"customer@example.com","title":"Hello","body":"<p>Welcome</p>","from":"sales@emailify.site","fromName":"Sales Team","password":"keep-this-secret"}
```

```json
{"action":"checkInbox","username":"sales","password":"keep-this-secret"}
```

If `action` is omitted, Emailify infers it from required fields.

For hosted SMTP instead of local Postfix:

```sh
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
```

## Postfix Receiving Setup

Install the packages on the server:

```sh
sudo apt-get update
sudo apt-get install postfix opendkim opendkim-tools
```

Create the mailbox root used by `reserveSender`:

```sh
sudo mkdir -p /var/mail/emailify/senders
sudo chown -R www-data:www-data /var/mail/emailify
```

Use virtual mailbox delivery in `/etc/postfix/main.cf`:

```conf
myhostname = mail.emailify.site
mydomain = emailify.site
myorigin = $mydomain
inet_interfaces = all
inet_protocols = ipv4
virtual_mailbox_domains = emailify.site
virtual_mailbox_base = /var/mail/emailify/senders
virtual_mailbox_maps = texthash:/var/mail/emailify/virtual_mailbox_maps
virtual_minimum_uid = 33
virtual_uid_maps = static:33
virtual_gid_maps = static:33
```

`reserveSender` maintains the exact-address map at
`/var/mail/emailify/virtual_mailbox_maps`. Existing senders can be seeded with:

```sh
sudo find /var/mail/emailify/senders -maxdepth 1 -mindepth 1 -type d \
  -printf '%f@emailify.site %f/Maildir/\n' \
  | sudo tee /var/mail/emailify/virtual_mailbox_maps >/dev/null
sudo chown www-data:www-data /var/mail/emailify/virtual_mailbox_maps
```

The map should contain one line per provisioned sender:

```conf
sales@emailify.site sales/Maildir/
```

Reload Postfix:

```sh
sudo systemctl restart postfix
```

## SPF, DKIM, DMARC

Add DNS records for `emailify.site`.

SPF:

```txt
emailify.site. TXT "v=spf1 mx ip4:YOUR_SERVER_IP -all"
```

DKIM with OpenDKIM:

```sh
sudo opendkim-genkey -D /etc/opendkim/keys/emailify.site -d emailify.site -s default
sudo chown -R opendkim:opendkim /etc/opendkim/keys/emailify.site
```

Publish the TXT value from:

```sh
sudo cat /etc/opendkim/keys/emailify.site/default.txt
```

Configure OpenDKIM:

```conf
# /etc/opendkim/KeyTable
default._domainkey.emailify.site emailify.site:default:/etc/opendkim/keys/emailify.site/default.private

# /etc/opendkim/SigningTable
*@emailify.site default._domainkey.emailify.site

# /etc/opendkim/TrustedHosts
127.0.0.1
localhost
emailify.site
mail.emailify.site
```

Connect Postfix to OpenDKIM in `/etc/postfix/main.cf`:

```conf
milter_default_action = accept
milter_protocol = 6
smtpd_milters = inet:localhost:8891
non_smtpd_milters = inet:localhost:8891
```

DMARC:

```txt
_dmarc.emailify.site. TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@emailify.site; adkim=s; aspf=s"
```

Also create an MX record:

```txt
emailify.site. MX 10 mail.emailify.site.
mail.emailify.site. A YOUR_SERVER_IP
```
