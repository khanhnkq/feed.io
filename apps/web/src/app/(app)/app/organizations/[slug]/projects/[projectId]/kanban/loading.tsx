import { KanbanBoardSkeleton } from "@/modules/media";

export default function KanbanLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading Kanban board"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      <KanbanBoardSkeleton />
    </main>
  );
}
