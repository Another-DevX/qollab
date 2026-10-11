import type { Metadata } from "next";

import { BackLink } from "@/components/experience/BackLink";
import { PauliErrorsExperience } from "@/components/experience/PauliErrorsExperience";

export const metadata: Metadata = {
  title: "Pauli errors",
};

export default function Page() {
  return (
    <>
      <BackLink href="/module/1" label="Cover" />
      <PauliErrorsExperience />
    </>
  );
}
