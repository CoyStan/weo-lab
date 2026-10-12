import type { Metadata } from "next";
import WeoLab from "./WeoLab";

export const metadata: Metadata = {
  title: "WEO Scenario Lab",
  description:
    "A 3D policy sandbox for macroeconomists: set fiscal, monetary, exchange-rate and structural policy on a stylised economy, stress it with shocks, add programme constraints, and test how much a projection depends on WEO assumptions.",
  robots: { index: false, follow: false },
};

export default function WeoLabPage() {
  return <WeoLab />;
}
