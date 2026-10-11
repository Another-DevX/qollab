import type { Metadata } from "next";

import { BackLink } from "@/components/experience/BackLink";
import { ErrorChallengeGame } from "@/components/experience/ErrorChallengeGame";
import { PageTransition } from "@/components/experience/PageTransition";

export const metadata: Metadata = {
  title: "Challenge",
};

export default function Page() {
  return (
    <>
      <BackLink href="/module/1/pauli-basis" label="Pauli basis" />
      <ErrorChallengeGame />
      <PageTransition
        nextNumber="04"
        question="What comes next?"
        teaser="You can read the three errors, write any operator in the Pauli basis, and name the error behind an outcome. The next step is decoherence and error-correcting codes."
        href="/module/1/conclusion"
        action="Continue to the conclusion"
      />
    </>
  );
}
