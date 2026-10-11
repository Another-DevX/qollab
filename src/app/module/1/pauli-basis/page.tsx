import type { Metadata } from "next";

import { BackLink } from "@/components/experience/BackLink";
import { PauliBasisExperience } from "@/components/experience/PauliBasisExperience";

export const metadata: Metadata = {
  title: "Pauli basis",
};

export default function Page() {
  return (
    <>
      <BackLink href="/module/1/pauli-errors" label="Pauli errors" />
      <PauliBasisExperience />
    </>
  );
}
