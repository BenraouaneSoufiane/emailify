import type { Metadata } from "next";
import { InboxClient } from "./InboxClient";

export const metadata: Metadata = {
  title: "Inbox | Emailify",
  description: "Read received messages for a reserved Emailify inbox.",
};

export default function InboxPage() {
  return <InboxClient />;
}
