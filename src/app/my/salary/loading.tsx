import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SalaryLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-1 h-5 w-64 animate-pulse rounded bg-muted" />

      <div className="mt-4 h-9 w-48 animate-pulse rounded bg-muted" />

      <Card className="mt-6 border-primary">
        <CardContent className="pt-6 text-center">
          <div className="mx-auto h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="mx-auto mt-2 h-10 w-48 animate-pulse rounded bg-muted" />
          <div className="mx-auto mt-1 h-4 w-24 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>

      {[1, 2].map((i) => (
        <Card key={i} className="mt-4">
          <CardHeader>
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex justify-between">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
