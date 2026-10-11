"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BlochSphere } from "@/components/bloch/BlochSphere";
import type { BlochArrow } from "@/components/bloch/types";
import { MathMatrix } from "@/components/math/MathMatrix";
import { Tex } from "@/components/math/Tex";
import { PAULI_INFO, pauliColor } from "@/components/experience/pauliInfo";
import { PageHeader } from "@/components/ui/editorial";
import { Button, FieldRow, LegendItem, Panel, Stat } from "@/components/ui/primitives";
import {
  PAULI_NAMES,
  blochTuple,
  blochVector,
  checkAnswer,
  formatReal,
  generateChallenge,
  pauliMatrix,
  type AnswerResult,
  type Challenge,
  type PauliName,
} from "@/lib/quantum";
import { usePalette } from "@/lib/theme";

interface Score {
  correct: number;
  total: number;
}

export function ErrorChallengeGame() {
  const palette = usePalette();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [chosen, setChosen] = useState<PauliName | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState<Score>({ correct: 0, total: 0 });
  const [streak, setStreak] = useState(0);

  // Generated on the client to avoid a hydration mismatch with SSR.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChallenge(generateChallenge());
  }, []);

  const newChallenge = useCallback(() => {
    setChallenge(generateChallenge());
    setChosen(null);
    setRevealed(false);
    setResult(null);
    setRound((value) => value + 1);
  }, []);

  const restart = useCallback(() => {
    setScore({ correct: 0, total: 0 });
    setStreak(0);
    newChallenge();
  }, [newChallenge]);

  const answer = (name: PauliName) => {
    if (!challenge || revealed) return;
    const outcome = checkAnswer(challenge, name);
    setChosen(name);
    setRevealed(true);
    setResult(outcome);
    setScore((previous) => ({
      correct: previous.correct + (outcome.correct ? 1 : 0),
      total: previous.total + 1,
    }));
    setStreak((previous) => (outcome.correct ? previous + 1 : 0));
  };

  const arrows = useMemo<BlochArrow[]>(() => {
    if (!challenge) return [];
    const initialVec = blochTuple(blochVector(challenge.initial));
    const finalVec = blochTuple(blochVector(challenge.final));
    return [
      { id: "initial", vector: initialVec, color: palette.original },
      {
        id: revealed ? `final-${round}` : "final-preview",
        vector: finalVec,
        color: palette.error,
        opacity: revealed ? 1 : 0.85,
        from: revealed ? initialVec : undefined,
      },
    ];
  }, [challenge, revealed, round, palette]);

  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
  const expectedInfo = challenge ? PAULI_INFO[challenge.error] : null;

  return (
    <section id="page-3" className="scroll-mt-24">
      <PageHeader
        number="03"
        kicker="Challenge"
        title="Name the error"
        dek="A secret Pauli error acts on a random state. Compare the two vectors and identify it."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Correct" value={`${score.correct} / ${score.total}`} hint="Right answers" tone={palette.original} />
        <Stat label="Accuracy" value={`${accuracy}%`} hint="Across all tries" />
        <Stat label="Streak" value={streak} hint="Consecutive correct" tone={palette.error} />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-24">
          <BlochSphere
            arrows={arrows}
            className="h-[380px] w-full sm:h-[480px] lg:h-[540px]"
            ariaLabel="Bloch sphere with the initial and final state vectors"
            overlay={
              <div className="flex flex-wrap gap-2">
                <LegendItem color={palette.original} label="Initial" />
                <LegendItem color={palette.error} label="Final" />
              </div>
            }
          />
        </div>

        <div className="space-y-5">
          <Panel>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-ink">
                Which error hit this qubit?
              </h4>
              <Button variant="ghost" size="sm" onClick={restart}>
                Reset
              </Button>
            </div>

            {challenge ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PAULI_NAMES.map((name) => {
                  const isCorrect = revealed && name === challenge.error;
                  const isWrongChoice = revealed && chosen === name && name !== challenge.error;
                  const color = pauliColor(name, palette);
                  return (
                    <button
                      key={name}
                      type="button"
                      disabled={revealed}
                      onClick={() => answer(name)}
                      aria-label={`Answer ${name}`}
                      className={[
                        "flex flex-col items-center gap-1 rounded-lg border py-3 transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-default",
                        isCorrect
                          ? "border-good/70 bg-good/15 text-good"
                          : isWrongChoice
                            ? "border-bad/70 bg-bad/15 text-bad"
                            : revealed
                              ? "border-line bg-surface-3/40 text-faint opacity-60"
                              : "border-line bg-surface-3/40 text-ink hover:bg-surface-3",
                      ].join(" ")}
                    >
                      <span
                        className="text-2xl font-semibold"
                        style={!revealed ? { color } : undefined}
                      >
                        {name}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider opacity-70">
                        {PAULI_INFO[name].title}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-faint">Generating challenge…</p>
            )}

            {!revealed && challenge ? (
              <p className="caption mt-4">
                Each error is a π rotation about one axis. Watch where the point
                lands.
              </p>
            ) : null}

            {revealed && challenge && result ? (
              <div className="mt-4">
                <Button variant="primary" onClick={newChallenge} className="w-full">
                  New challenge →
                </Button>
              </div>
            ) : null}
          </Panel>

          <AnimatePresence mode="wait">
            {revealed && challenge && expectedInfo && result ? (
              <motion.div
                key={round}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <Panel className={result.correct ? "border-good/40" : "border-bad/40"}>
                  <div role="status" aria-live="polite" className="mb-3 flex items-center gap-2">
                    <span className={`text-base font-semibold ${result.correct ? "text-good" : "text-bad"}`}>
                      {result.correct ? "✓ Correct" : "✗ Not quite"}
                    </span>
                  </div>

                  <p className="text-sm leading-relaxed text-muted">
                    {result.correct ? (
                      <>
                        The error was{" "}
                        <strong style={{ color: pauliColor(challenge.error, palette) }}>
                          {challenge.error}
                        </strong>{" "}
                        — {expectedInfo.title.toLowerCase()}.
                      </>
                    ) : (
                      <>
                        You chose <strong className="text-ink">{chosen}</strong>,
                        but the error was{" "}
                        <strong style={{ color: pauliColor(challenge.error, palette) }}>
                          {challenge.error}
                        </strong>{" "}
                        — {expectedInfo.title.toLowerCase()}.
                      </>
                    )}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <MathMatrix
                      matrix={pauliMatrix(challenge.error)}
                      label={`${challenge.error} =`}
                      digits={0}
                      highlight
                      accent={pauliColor(challenge.error, palette)}
                    />
                    <Tex tex={expectedInfo.mapTex} className="text-xs" />
                  </div>

                  <div className="mt-4">
                    <FieldRow label="Initial (x, y, z)">
                      {coordText(blochVector(challenge.initial))}
                    </FieldRow>
                    <FieldRow label="Final (x, y, z)">
                      {coordText(blochVector(challenge.final))}
                    </FieldRow>
                    <FieldRow label="Check">
                      <Tex tex={`${challenge.error}\\,|\\psi\\rangle = |\\psi'\\rangle`} />
                    </FieldRow>
                  </div>

                  <p className="caption mt-3">
                    {challenge.error === "I"
                      ? "The vector never moved: the identity applies no change."
                      : expectedInfo.effect}
                  </p>
                </Panel>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function coordText(v: { x: number; y: number; z: number }): string {
  return `(${formatReal(v.x, 3)}, ${formatReal(v.y, 3)}, ${formatReal(v.z, 3)})`;
}
