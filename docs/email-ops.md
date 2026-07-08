# Emailify Mail Operations

## Endpoints

All CROO-facing endpoints accept `POST` JSON bodies.

- `/api/croo/newTemplate`
  - `description` string, required
  - `imageUrl` string, optional
  - Returns `{ ok, html }`
- `/api/croo/reserveSender`
  - `username` string, required
  - `name` string, required
  - Creates `username@emailify.site` under `EMAILIFY_SENDER_ROOT`
  - Returns `{ ok, sender, proof }`. Keep `proof`; it is required to send from the reserved address.
- `/api/croo/send`
  - `to` string, required
  - `title` string, required
  - `body` string, required, HTML accepted
  - `sender`, `senderAddress`, or `from` string, optional reserved sender address
  - `senderpoof` string, required when using a reserved sender address. `senderproof` and `senderProof` are also accepted.
  - `reply_to` or `replyTo` string, optional
  - `attachment` or `attachement`, optional. Use a URL/path string, an object with `url`, `path`, or base64 `content`, or an array of those.

## Environment

```sh
EMAILIFY_DOMAIN=emailify.site
EMAILIFY_FROM="Emailify <no-reply@emailify.site>"
EMAILIFY_SENDER_ROOT=/var/mail/emailify/senders
SENDMAIL_PATH=/usr/sbin/sendmail
```

## CROO Provider

The CROO SDK runs as a separate provider process. Keep the Next app running so
the provider can call the local Emailify endpoints, then start the provider.
Use port `3333` with `npm run dev`, and port `3334` with the production build
started by `npm run start`.

```sh
export CROO_API_URL="https://api.croo.network"
export CROO_WS_URL="wss://api.croo.network/ws"
export CROO_SDK_KEY="croo_sk_..."
export EMAILIFY_BASE_URL="http://localhost:3333"
export CROO_DELIVERABLE_TYPE="schema"

npm run dev
```

For the build version, use:

```sh
npm run build
export EMAILIFY_BASE_URL="http://localhost:3334"
npm run start
```

In another shell:

```sh
npm run croo:provider
```

Requester requirements should be a JSON object string. Supported actions:

```json
{"action":"newTemplate","description":"Launch email for a summer sale","imageUrl":"https://example.com/banner.png"}
```

```json
{"action":"reserveSender","username":"sales","name":"Sales Team"}
```

```json
{"action":"send","to":"customer@example.com","title":"Hello","body":"<p>Welcome</p>","sender":"sales@emailify.site","senderpoof":"proof_returned_by_reserveSender"}
```

If `action` is omitted, the provider infers it from required fields.

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
virtual_mailbox_maps = regexp:/etc/postfix/virtual_mailbox_maps
virtual_minimum_uid = 33
virtual_uid_maps = static:33
virtual_gid_maps = static:33
```

Map any provisioned username to its Maildir in `/etc/postfix/virtual_mailbox_maps`:

```conf
/^([^@]+)@emailify\.site$/ ${1}/Maildir/
```

Reload Postfix:

```sh
sudo postmap /etc/postfix/virtual_mailbox_maps
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
