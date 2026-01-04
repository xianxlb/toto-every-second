import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { useWebSocket } from "./useWebSocket";
import type { TotoResult } from "./types";
import TotoCard from "./TotoCard";
import HistoryTable from "./HistoryTable";
import Pagination from "./Pagination";
import AboutSection from "./AboutSection";

const PAGINATION_ITEMS = 24;

function App() {
  const [totoResult, setTotoResult] = useState<TotoResult | null>(null);
  const [history, setHistory] = useState<TotoResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [, setWins] = useState(0);
  const [totalPrizes, setTotalPrizes] = useState(0);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = backendUrl
    ? `${wsProtocol}//${backendUrl.replace(/^https?:\/\//, '')}/ws`
    : `${wsProtocol}//${window.location.host}/ws`;
  const apiBase = backendUrl || '';
  const socket = useWebSocket(wsUrl);

  // Fetch wins count and total prizes
  useEffect(() => {
    fetch(`${apiBase}/wins`)
      .then((res) => res.json())
      .then((data) => {
        setWins(data.wins);
        setTotalPrizes(data.totalPrizes);
      })
      .catch(console.error);
  }, [apiBase]);

  // Fetch history
  const fetchHistory = useCallback(async (pageNum: number) => {
    try {
      const res = await fetch(`${apiBase}/history/toto?page=${pageNum}`);
      const data = await res.json();
      setHistory(data.data || []);
      setTotalResults(data.total || 0);
      // Set the latest draw immediately on first load
      if (pageNum === 0 && data.data?.length > 0 && !totoResult) {
        setTotoResult(data.data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  }, [apiBase, totoResult]);

  useEffect(() => {
    fetchHistory(page);
  }, [page, fetchHistory]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      if (isPaused) return;

      try {
        const result = JSON.parse(event.data) as TotoResult;

        // Prize amounts based on Singapore Pools TOTO structure
        const prizeAmounts: Record<number, number> = {
          1.0: 1000000,   // Group 1: Jackpot
          0.85: 100000,   // Group 2: 5 + Additional
          0.7: 50000,     // Group 3: 5 numbers
          0.55: 2000,     // Group 4: 4 + Additional
          0.4: 50,        // Group 5: 4 numbers
          0.25: 25,       // Group 6: 3 + Additional
          0.1: 10,        // Group 7: 3 numbers
        };

        if (result.lottery_type === "toto") {
          setTotoResult(result);

          if (result.score > 0) {
            setWins((prev) => prev + 1);
            setTotalPrizes((prev) => prev + (prizeAmounts[result.score] || 0));
          }

          if (page === 0) {
            setHistory((prev) => {
              const newHistory = [result, ...prev];
              return newHistory.slice(0, PAGINATION_ITEMS);
            });
            setTotalResults((prev) => prev + 1);
          }
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, isPaused, page]);

  // Sync page with URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPage = parseInt(params.get("page") || "0");
    if (!isNaN(urlPage) && urlPage !== page) {
      setPage(urlPage);
    }
  }, []);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    const url = new URL(window.location.href);
    if (newPage === 0) {
      url.searchParams.delete("page");
    } else {
      url.searchParams.set("page", String(newPage));
    }
    window.history.pushState({}, "", url);
  };

  const totalPages = Math.ceil(totalResults / PAGINATION_ITEMS);

  return (
    <div className="container">
      <header>
        <h1>Toto Every Second</h1>
        <p className="tagline">Watch the Odds Fail in Real-Time</p>
        <p className="description">
          A Singapore Toto simulator playing every second to show how unlikely winning really is.
        </p>
        <div className="wins-counter">
          <span className="wins-label">Total Prizes Won:</span>
          <span className="wins-number">S${totalPrizes.toLocaleString()}</span>
        </div>
        <div className="wins-counter">
          <span className="wins-label">Total Bet Spent:</span>
          <span className="bet-number">S${totalResults.toLocaleString()}</span>
        </div>
      </header>

      <div className="cards">
        <TotoCard result={totoResult} />
      </div>

      <section className="history-section">
        <div className="history-header">
          <h2>Draw History</h2>
          <button
            className="pause-button"
            onClick={() => {
              if (isPaused) {
                // Resuming - refresh history to get all missed draws
                fetchHistory(page);
              }
              setIsPaused(!isPaused);
            }}
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
        </div>

        <HistoryTable history={history} />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </section>

      <AboutSection />

      <footer className="footer">
        <a
          href="https://github.com/xianxlb/toto-every-second"
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
        >
          <img
            src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
            alt="GitHub"
          />
          View on GitHub
        </a>
        <span className="footer-separator">|</span>
        <span>Inspired by lotteryeverysecond.lffl.me</span>
      </footer>
    </div>
  );
}

export default App;
