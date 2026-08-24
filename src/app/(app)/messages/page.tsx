import { Suspense } from "react";
import { MessagesView } from "@/components/messages/messages-view";

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesView />
    </Suspense>
  );
}
