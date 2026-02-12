import { Card, CardContent } from "@/components/ui/card";

export default function HistoryLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-1 h-5 w-56 animate-pulse rounded bg-muted" />

      <div className="mt-4 h-9 w-48 animate-pulse rounded bg-muted" />

      <div className="mt-6 grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4 text-center">
              <div className="mx-auto h-8 w-12 animate-pulse rounded bg-muted" />
              <div className="mx-auto mt-1 h-4 w-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-4 w-56 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
