import type { Metadata } from "next";
import Game from "./game/ui/Game";

export const metadata: Metadata = {
  title: "WEO Scenario Lab",
  description:
    "A policy game for economists: run a stylised economy one quarter at a time, through six missions or in free play, with rates, budgets, exchange rates, shocks and an IMF programme.",
  robots: { index: false, follow: false },
};

export default function WeoLabPage() {
  return <Game />;
}
