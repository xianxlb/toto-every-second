import { useState, useEffect } from "react";
import type { TotoResult } from "./types";
import Ball from "./Ball";

interface TotoCardProps {
  result: TotoResult | null;
}

function TotoCard({ result }: TotoCardProps) {
  const getStoredNumbers = (key: string, defaultValue: number[]) => {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  };

  const [userNumbers, setUserNumbers] = useState<number[]>(() =>
    getStoredNumbers("toto-numbers", [0, 0, 0, 0, 0, 0])
  );
  const [userAdditional, setUserAdditional] = useState<number>(() => {
    const stored = localStorage.getItem("toto-additional");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return 0;
      }
    }
    return 0;
  });

  useEffect(() => {
    localStorage.setItem("toto-numbers", JSON.stringify(userNumbers));
  }, [userNumbers]);

  useEffect(() => {
    localStorage.setItem("toto-additional", JSON.stringify(userAdditional));
  }, [userAdditional]);

  const hasUserGuess = userNumbers.some((n) => n > 0) || userAdditional > 0;

  if (!result) {
    return (
      <div className="card toto">
        <h2>Singapore Toto</h2>
        <p className="waiting">Waiting for first draw...</p>
      </div>
    );
  }

  const getPrizeGroup = (score: number): string => {
    if (score === 1.0) return "Group 1 - JACKPOT!";
    if (score === 0.85) return "Group 2";
    if (score === 0.7) return "Group 3";
    if (score === 0.55) return "Group 4";
    if (score === 0.4) return "Group 5";
    if (score === 0.25) return "Group 6";
    if (score === 0.1) return "Group 7";
    return "No Prize";
  };

  return (
    <div className={`card toto ${result.score === 1.0 ? "jackpot" : ""}`}>
      <h2>Singapore Toto</h2>
      <div className="draw-info">
        <span className="draw-label">Game #{result.id}</span>
        <span className={`score ${result.score > 0 ? "winner" : ""}`}>
          {getPrizeGroup(result.score)}
        </span>
      </div>

      <div className="result-section">
        <h3>Winning Numbers</h3>
        <div className="balls-row">
          {result.draw.numbers.map((num: number, i: number) => (
            <Ball key={`draw-${i}`} value={num} />
          ))}
          <span className="separator">+</span>
          <Ball value={result.draw.additional} type="additional" />
        </div>
      </div>

      <div className="result-section">
        <h3>Quick Pick</h3>
        <div className="balls-row">
          {result.guesses[0].numbers.map((num: number, i: number) => (
            <Ball
              key={`guess-${i}`}
              value={num}
              isMatch={result.draw.numbers.includes(num) || num === result.draw.additional}
            />
          ))}
        </div>
      </div>

      <div className="result-section">
        <h3>Your Pick</h3>
        <div className="balls-row">
          {userNumbers.map((num: number, i: number) => (
            <Ball
              key={`user-${i}`}
              value={num}
              editable={true}
              isMatch={hasUserGuess && num > 0 && result.draw.numbers.includes(num)}
              min={1}
              max={49}
              onChange={(newValue) => {
                const updated = [...userNumbers];
                updated[i] = newValue;
                setUserNumbers(updated);
              }}
            />
          ))}
          <span className="separator">+</span>
          <Ball
            value={userAdditional}
            type="additional"
            editable={true}
            isMatch={hasUserGuess && userAdditional > 0 && (result.draw.numbers.includes(userAdditional) || userAdditional === result.draw.additional)}
            min={1}
            max={49}
            onChange={(newValue) => setUserAdditional(newValue)}
          />
        </div>
      </div>
    </div>
  );
}

export default TotoCard;
