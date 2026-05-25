"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import AvatarPicker from "./room/[code]/components/ui/AvatarPicker";

const RETRO_AVATARS = [
  "/avatars/avatar_dog.png",
  "/avatars/avatar_cat.png",
  "/avatars/avatar_robot.png",
  "/avatars/avatar_wizard.png",
  "/avatars/avatar_dino.png",
  "/avatars/avatar_fairy.png",
  "/avatars/avatar_knight.png",
  "/avatars/avatar_unicorn.png",
  "/avatars/avatar_ninja.png",
  "/avatars/avatar_princess.png",
  "/avatars/avatar_astronaut.png",
  "/avatars/avatar_mermaid.png",
  "/avatars/avatar_pirate.png",
  "/avatars/avatar_bunny.png",
  "/avatars/avatar_cyborg.png",
];

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("sparky_session");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("sparky_session", id);
  }
  return id;
}

export default function Home() {
  const router = useRouter();
  const createRoom = useMutation(api.rooms.createRoom);
  const joinRoom = useMutation(api.rooms.joinRoom);

  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(RETRO_AVATARS[0]);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);

  // Retro Toast System
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  function triggerToast(message: string, type: "error" | "success" = "error") {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      const sessionId = getSessionId();
      if (activeTab === "create") {
        const result = await createRoom({
          hostSessionId: sessionId,
          hostName: name.trim(),
          hostAvatar: avatar,
        });
        router.push(`/room/${result.code}`);
      } else {
        if (joinCode.length < 6) {
          setLoading(false);
          return;
        }
        const result = await joinRoom({
          code: joinCode.toUpperCase(),
          sessionId,
          name: name.trim(),
          avatar: avatar,
        });
        router.push(`/room/${result.code}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      triggerToast(msg, "error");
      setLoading(false);
    }
  }

  return (
    <main
      className="h-dvh-safe w-full flex flex-col justify-between items-center px-4 py-6 overflow-hidden crt-effect select-none"
      style={{ backgroundColor: "var(--cream)" }}
    >
      {/* Toast Notification Container */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-4">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ y: -45, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -45, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-[var(--card-bg)] border-3 border-[var(--rust)] shadow-[3px_3px_0px_var(--rust-dark)] p-3 text-center rounded flex items-center justify-center gap-2"
            >
              <span className="text-[var(--rust)] font-mono-custom font-bold text-xs uppercase tracking-wider leading-tight">
                [!] {toast.message}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Header/Logo */}
      <motion.div
        className="text-center mt-auto mb-5 flex-shrink-0"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <img
          src="/logo.png"
          alt="Sparky — Online Party Games"
          className="mx-auto"
          style={{ width: "220px", maxWidth: "60vw", imageRendering: "auto" }}
        />
      </motion.div>

      {/* Single Unified Card */}
      <motion.div
        className="retro-card w-full max-w-sm flex flex-col overflow-hidden my-auto flex-shrink-0"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {/* Tab switcher buttons segment */}
        <div className="flex border-b-3 border-[var(--teal)] bg-[var(--cream)] flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className="flex-1 py-2 font-mono-custom font-bold text-xs uppercase tracking-widest text-center border-r-3 border-[var(--teal)] transition-all cursor-pointer"
            style={{
              backgroundColor: activeTab === "create" ? "var(--teal)" : "transparent",
              color: activeTab === "create" ? "white" : "var(--ink)",
            }}
          >
            Create Room
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("join")}
            className="flex-1 py-2 font-mono-custom font-bold text-xs uppercase tracking-widest text-center transition-all cursor-pointer"
            style={{
              backgroundColor: activeTab === "join" ? "var(--teal)" : "transparent",
              color: activeTab === "join" ? "white" : "var(--ink)",
            }}
          >
            Join Room
          </button>
        </div>

        {/* Card Form Body */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3.5">
          {/* Shared Your Name Input */}
          <div>
            <label
              className="block font-mono-custom font-bold uppercase text-[10px] tracking-widest mb-1.5"
              style={{ color: "var(--muted)" }}
            >
              Your Name
            </label>
            <input
              className="retro-input w-full text-sm"
              placeholder="e.g. Alex (max 16 chars)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              required
            />
          </div>

          {/* Shared Avatar Picker */}
          <div>
            <label
              className="block font-mono-custom font-bold uppercase text-[10px] tracking-widest mb-1.5"
              style={{ color: "var(--muted)" }}
            >
              Pick Your Avatar
            </label>
            <AvatarPicker
              emojis={RETRO_AVATARS}
              selected={avatar}
              onSelect={setAvatar}
            />
          </div>

          {/* Conditional Join Code Entry */}
          <div className="relative">
            <AnimatePresence initial={false}>
              {activeTab === "join" && (
                <motion.div
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: "auto", scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-1">
                    <label
                      className="block font-mono-custom font-bold uppercase text-[10px] tracking-widest mb-1.5"
                      style={{ color: "var(--muted)" }}
                    >
                      Room Code
                    </label>
                    <div className="flex gap-2 items-stretch">
                      <input
                        className="retro-input flex-grow text-xl text-center font-display tracking-[0.15em] uppercase bg-(--cream) border-2 border-(--teal) py-2 min-w-0"
                        placeholder="ABC123"
                        value={joinCode}
                        onChange={(e) =>
                          setJoinCode(e.target.value.toUpperCase().slice(0, 6))
                        }
                        maxLength={6}
                        required
                      />
                      <button
                        type="submit"
                        className="btn-teal px-4 text-xs font-bold tracking-widest cursor-pointer flex-shrink-0 flex items-center justify-center rounded border-2"
                        style={{ borderColor: "var(--teal-dark)" }}
                        disabled={loading || !name.trim() || joinCode.length < 6}
                      >
                        {loading ? "..." : "🚀 Enter"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Dynamic Action Submit Button (Only shows when Create Room is active) */}
          <div className="relative">
            <AnimatePresence initial={false}>
              {activeTab === "create" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <button
                    type="submit"
                    className="btn-rust w-full py-3 text-sm font-bold tracking-widest cursor-pointer rounded border-2"
                    style={{ borderColor: "var(--rust-dark)" }}
                    disabled={loading || !name.trim()}
                  >
                    {loading ? "Creating..." : "🎲 Create Room"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>
      </motion.div>

      {/* Footer */}
      <motion.p
        className="mt-5 mb-auto text-[9px] uppercase tracking-widest font-mono-custom text-center flex-shrink-0"
        style={{ color: "var(--muted)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        No account needed · Works on any device
      </motion.p>
    </main>
  );
}
