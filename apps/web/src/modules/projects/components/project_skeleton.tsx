import { Card, CardContent, CardFooter, CardHeader, Skeleton } from "@/modules/ui";

export function ProjectSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Loading projects"
      aria-busy="true"
    >
      {[0, 1, 2].map((item) => (
        <Card
          className="min-h-[220px] border-line bg-surface"
          key={item}
          aria-hidden="true"
        >
          <CardContent>
            <CardHeader>
              <Skeleton className="size-10 rounded-lg" />
              <Skeleton className="h-2.5 w-16" />
            </CardHeader>
            <Skeleton className="mt-6 h-5 w-2/3" />
            <Skeleton className="mt-2 h-3 w-4/5" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="size-4" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
