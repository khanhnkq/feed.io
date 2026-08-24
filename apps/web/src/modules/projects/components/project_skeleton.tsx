import { Card, CardContent, CardFooter, CardHeader } from "@/modules/ui";

export function ProjectSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Loading projects"
      aria-busy="true"
    >
      {[0, 1, 2].map((item) => (
        <Card
          className="min-h-[220px]"
          key={item}
          aria-hidden="true"
        >
          <CardContent>
            <CardHeader>
              <span className="size-10 animate-pulse rounded-lg bg-[#e5e6df]" />
              <span className="h-2.5 w-16 animate-pulse rounded bg-[#e5e6df]" />
            </CardHeader>
            <i className="mt-6 block h-5 w-2/3 animate-pulse rounded bg-[#e5e6df]" />
            <i className="mt-2 block h-3 w-4/5 animate-pulse rounded bg-[#e5e6df]" />
          </CardContent>
          <CardFooter>
            <span className="h-3 w-20 animate-pulse rounded bg-[#e5e6df]" />
            <span className="size-4 animate-pulse rounded bg-[#e5e6df]" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
