"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Board } from "@/lib/board";
import { applyOp, type Op } from "@/lib/ops";

let tempCounter = 0;
const tempId = () => `tmp-${++tempCounter}`;

type Loaded = { board: Board; version: string; vault: string };

async function fetchBoard(): Promise<Loaded> {
  const res = await fetch("/api/board", { cache: "no-store" });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Could not load the board.");
  return body;
}

const messageOf = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

/**
 * Board state kept in sync with the vault on disk.
 * - Changes show up at once, then the server's answer (the real files) replaces the guess.
 * - The files are checked every `pollMs`, so edits made elsewhere (for example in Obsidian) appear without a reload.
 */
export function useBoard({ pollMs = 2000 }: { pollMs?: number } = {}) {
  const [board, setBoard] = useState<Board | null>(null);
  const [vault, setVault] = useState("");
  const [error, setError] = useState<string | null>(null);
  const version = useRef("");
  const pending = useRef(0);
  const paused = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const apply = useCallback((data: Loaded) => {
    version.current = data.version;
    setBoard(data.board);
    setVault(data.vault);
    setError(null);
  }, []);

  const load = useCallback(async () => {
    try {
      apply(await fetchBoard());
    } catch (e) {
      setError(messageOf(e, "Could not load the board."));
    }
  }, [apply]);

  useEffect(() => {
    let ignore = false;
    fetchBoard().then(
      (data) => {
        if (!ignore) apply(data);
      },
      (e) => {
        if (!ignore) setError(messageOf(e, "Could not load the board."));
      },
    );
    return () => {
      ignore = true;
    };
  }, [apply]);

  useEffect(() => {
    const timer = setInterval(async () => {
      if (pending.current > 0 || paused.current) return;
      try {
        const res = await fetch("/api/board/version", { cache: "no-store" });
        if (!res.ok) return;
        const body = await res.json();
        if (body.version !== version.current && pending.current === 0 && !paused.current) await load();
      } catch {
        /* the server may be restarting: try again next time */
      }
    }, pollMs);
    return () => clearInterval(timer);
  }, [load, pollMs]);

  const dispatch = useCallback(
    (op: Op) => {
      setBoard((current) => (current ? applyOp(current, op, tempId) : current));
      pending.current += 1;
      queue.current = queue.current.then(async () => {
        try {
          const res = await fetch("/api/ops", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(op),
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body.error ?? "Could not save the change.");
          version.current = body.version;
          if (pending.current === 1) setBoard(body.board); // the last change in flight: trust the files
          setError(null);
        } catch (e) {
          const message = messageOf(e, "Could not save the change.");
          await load(); // go back to what is really in the files
          setError(message); // and keep the message, which a successful load would have cleared
        } finally {
          pending.current -= 1;
        }
      });
    },
    [load],
  );

  /** Stops background refreshes while the person is dragging a card or typing in a dialog. */
  const setPaused = useCallback((value: boolean) => {
    paused.current = value;
  }, []);

  return { board, vault, error, dispatch, setPaused, reload: load };
}
