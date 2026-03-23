import { Disclaimer } from "@/components/disclaimer";
import { SnakeMatchApp } from "@/components/snake-match-app";

export default function Home() {
  return (
    <main className="grain-overlay flex flex-1 flex-col overflow-x-hidden">
      <SnakeMatchApp />
      <Disclaimer />
    </main>
  );
}
