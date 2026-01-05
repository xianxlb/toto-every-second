import { useState, useEffect, useRef } from "react";
import "./App.css";
import {
  generateResult,
  getCurrentSecond,
  prizeAmounts,
  type TotoResult,
} from "./lottery";
import TotoCard from "./TotoCard";
import HistoryTable from "./HistoryTable";
import Pagination from "./Pagination";
import AboutSection from "./AboutSection";

const PAGINATION_ITEMS = 24;
const MAX_HISTORY = 10000; // Keep last 10k draws in memory

function App() {
  const [currentResult, setCurrentResult] = useState<TotoResult | null>(null);
  const [history, setHistory] = useState<TotoResult[]>([]);
  const [page, setPage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [totalPrizes, setTotalPrizes] = useState(0);
  const [totalDraws, setTotalDraws] = useState(0);
  const lastSecondRef = useRef<number>(0);
  const isPausedRef = useRef(isPaused);

  // Keep ref in sync with state for interval callback
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Main draw loop - runs every frame, checks if second changed
  useEffect(() => {
    const tick = () => {
      if (isPausedRef.current) return;

      const currentSecond = getCurrentSecond();
      if (currentSecond !== lastSecondRef.current) {
        lastSecondRef.current = currentSecond;

        const result = generateResult(currentSecond);
        setCurrentResult(result);
        setTotalDraws((prev) => prev + 1);

        if (result.score > 0) {
          setTotalPrizes((prev) => prev + (prizeAmounts[result.score] || 0));
        }

        setHistory((prev) => {
          const newHistory = [result, ...prev];
          return newHistory.slice(0, MAX_HISTORY);
        });
      }
    };

    // Initial tick
    tick();

    // Run at 60fps to catch second changes instantly
    const intervalId = setInterval(tick, 16);

    return () => clearInterval(intervalId);
  }, []);

  // Sync page with URL on mount
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

  // Paginate history
  const paginatedHistory = history.slice(
    page * PAGINATION_ITEMS,
    (page + 1) * PAGINATION_ITEMS
  );
  const totalPages = Math.ceil(history.length / PAGINATION_ITEMS);

  return (
    <div className="container">
      <header>
        <h1>Toto Every Second</h1>
        <p className="tagline">Watch the Odds Fail in Real-Time</p>
        <p className="description">
          A Singapore Toto simulator playing every second to show how unlikely
          winning really is.
        </p>
        <div className="wins-counter">
          <span className="wins-label">Total Prizes Won:</span>
          <span className="wins-number">
            S${totalPrizes.toLocaleString()}
          </span>
        </div>
        <div className="wins-counter">
          <span className="wins-label">Total Bet Spent:</span>
          <span className="bet-number">S${totalDraws.toLocaleString()}</span>
        </div>
      </header>

      <div className="cards">
        <TotoCard result={currentResult} />
      </div>

      <section className="history-section">
        <div className="history-header">
          <h2>Draw History</h2>
          <button
            className="pause-button"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
        </div>

        <HistoryTable history={paginatedHistory} />

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
          View on GitHub
        </a>
        <span className="footer-separator">|</span>
        <span>Inspired by lotteryeverysecond.lffl.me</span>
      </footer>
    </div>
  );
}

export default App;
