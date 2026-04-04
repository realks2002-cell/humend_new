"use client";

import { Bot } from "lucide-react";

export default function ChatTypingIndicator() {
  return (
    <div className="flex gap-2 px-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex items-center rounded-2xl rounded-bl-md bg-muted px-4 py-2">
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
