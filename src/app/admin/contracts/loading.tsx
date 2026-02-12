import { Card, CardContent } from "@/components/ui/card";

export default function AdminContractsLoading() {
  return (
    <div className="p-6">
      <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-1 h-5 w-48 animate-pulse rounded bg-muted" />

      <div className="mt-6 flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-20 animate-pulse rounded bg-muted" />
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-4 w-56 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
