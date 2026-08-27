import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/moment/SiteNav";

export const Route = createFileRoute("/event/$id")({
  component: EventDetail,
});

function EventDetail() {
  const { id } = Route.useParams();

  return (
    <div className="grain min-h-screen">
      <SiteNav />
      <div className="mx-auto max-w-4xl px-5 py-14">
        <div className="pattern-adinkra pointer-events-none fixed inset-0" />
        
        <div className="relative">
          <h1 className="text-display text-4xl uppercase">Event Details</h1>
          <p className="mt-4 text-muted-foreground">Event ID: {id}</p>
          
          <div className="mt-8 surface-panel p-8">
            <p className="text-center text-muted-foreground">
              Event details will be loaded from API
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
