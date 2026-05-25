"use client";
import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WouldYouRatherQuestion } from "@/lib/types";

interface QuestionCardProps {
  question: WouldYouRatherQuestion;
  selectedAnswer: "A" | "B" | null;
  locked: boolean;
  onSelect?: (option: "A" | "B") => void;
  showResults?: boolean;
  votesA?: number;
  votesB?: number;
  totalVotes?: number;
}

function OptionPanel({
  option,
  side,
  selected,
  locked,
  showResults,
  votes,
  totalVotes,
  onSelect,
}: {
  option: { emoji: string; label: string; sublabel?: string };
  side: "A" | "B";
  selected: boolean;
  locked: boolean;
  showResults: boolean;
  votes: number;
  totalVotes: number;
  onSelect?: () => void;
}) {
  const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
  const isLight = side === "A";

  return (
    <motion.button
      onClick={locked ? undefined : onSelect}
      whileHover={locked ? {} : { scale: 1.015 }}
      whileTap={locked ? {} : { scale: 0.985 }}
      className="w-full relative overflow-hidden flex flex-col items-center justify-center gap-3 py-8 px-6"
      style={{
        minHeight: "200px",
        background: isLight ? "#FDFAF3" : "#1E5F5F",
        border: "3px solid #004747",
        borderRadius: "0.25rem",
        boxShadow: selected ? "none" : "4px 4px 0px 0px #8B7355",
        transform: selected ? "translate(4px, 4px)" : "none",
        cursor: locked ? "default" : "pointer",
        transition: "box-shadow 0.1s ease, transform 0.1s ease",
      }}
    >
      {/* Vote fill from bottom */}
      {showResults && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${pct}%` }}
          transition={{ duration: 0.85, ease: "easeOut" }}
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            backgroundColor: isLight ? "rgba(30,95,95,0.1)" : "rgba(148,209,209,0.2)",
          }}
        />
      )}

      <span className="text-7xl leading-none relative z-10 select-none">{option.emoji}</span>

      <span
        className="font-display text-xl md:text-2xl uppercase text-center leading-tight relative z-10"
        style={{ color: isLight ? "#004747" : "white" }}
      >
        {option.label}
      </span>

      {option.sublabel && (
        <span
          className="font-mono-custom text-xs italic text-center relative z-10"
          style={{ color: isLight ? "#8B7355" : "rgba(255,255,255,0.7)" }}
        >
          {option.sublabel}
        </span>
      )}

      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="font-display text-4xl relative z-10"
            style={{ color: isLight ? "#004747" : "white" }}
          >
            {pct}%
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
            style={{
              backgroundColor: isLight ? "#1E5F5F" : "#FDFAF3",
              color: isLight ? "white" : "#1E5F5F",
            }}
          >
            ✓
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function QuestionCard({
  question,
  selectedAnswer,
  locked,
  onSelect,
  showResults = false,
  votesA = 0,
  votesB = 0,
  totalVotes = 0,
}: QuestionCardProps) {
  const { optionA, optionB } = question;

  return (
    <div className="relative w-full flex flex-col gap-4 pt-5">
      <OptionPanel
        option={optionA}
        side="A"
        selected={selectedAnswer === "A"}
        locked={locked}
        showResults={showResults}
        votes={votesA}
        totalVotes={totalVotes}
        onSelect={() => onSelect?.("A")}
      />

      {/* OR stamp floating between cards */}
      <div
        className="absolute left-1/2 z-30 pointer-events-none"
        style={{
          top: "calc(50% + 10px)",
          transform: "translate(-50%, -50%) rotate(-12deg)",
        }}
      >
        <div
          className="w-16 h-16 flex items-center justify-center font-display text-xl uppercase rounded-full"
          style={{
            backgroundColor: "#C4472A",
            color: "white",
            border: "3px solid #FDFAF3",
            boxShadow: "3px 3px 0px #A3331A",
          }}
        >
          OR
        </div>
      </div>

      <OptionPanel
        option={optionB}
        side="B"
        selected={selectedAnswer === "B"}
        locked={locked}
        showResults={showResults}
        votes={votesB}
        totalVotes={totalVotes}
        onSelect={() => onSelect?.("B")}
      />
    </div>
  );
}

export default memo(QuestionCard);
