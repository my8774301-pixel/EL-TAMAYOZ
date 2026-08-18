import { useEffect, useState } from "react";

/** Black-screen welcome (white + gold) shown for 3 seconds after login. */
export default function Splash({ text, onDone }: { text: string; onDone: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone();
    }, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black px-6 text-center">
      <h1
        className="anim text-3xl font-black leading-tight sm:text-5xl"
        style={{
          background: "linear-gradient(100deg,#ffffff 0%,#fff6df 40%,#e6b34a 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {text}
      </h1>
    </div>
  );
}
