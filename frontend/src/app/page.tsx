import { Board } from "@/components/Board";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col px-6 py-6 sm:px-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-navy">Kanban</h1>
        <div className="mt-2 h-1 w-10 rounded-full bg-accent" />
      </header>
      <Board />
    </main>
  );
}
