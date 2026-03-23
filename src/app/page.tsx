import { Disclaimer } from "@/components/disclaimer";
import { Hero } from "@/components/hero";
import { SnakeMatchApp } from "@/components/snake-match-app";

export default function Home() {
  return (
    <main className="grain-overlay flex flex-1 flex-col overflow-x-hidden">
      <Hero />
      <SnakeMatchApp />
      <Disclaimer />
    </main>
  );
}
