import { useEffect, useState, type RefObject } from "react";
import { useInView } from "motion/react";

// Live visuals run only while on screen and stay still under reduced motion.
export function useLive(ref: RefObject<HTMLElement | null>) {
  const inView = useInView(ref, { margin: "80px 0px" });
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(query.matches);
    const on = () => setReduce(query.matches);
    query.addEventListener("change", on);
    return () => query.removeEventListener("change", on);
  }, []);
  return { running: inView && !reduce, reduce };
}
