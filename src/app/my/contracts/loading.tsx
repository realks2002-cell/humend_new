import { Card, CardContent } from "@/components/ui/card";

export default function ContractsLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="h-8 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-1 h-5 w-56 animate-pulse rounded bg-muted" />

      <div className="mt-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-4 w-48 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-9 w-24 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
