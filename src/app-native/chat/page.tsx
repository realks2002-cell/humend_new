import { Suspense } from "react";
import { AuthGuard } from "@/lib/native-api/auth-guard";
import { Loader2 } from "lucide-react";
import ChatClient from "./client";

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <AuthGuard>
        <ChatClient />
      </AuthGuard>
    </Suspense>
  );
}
