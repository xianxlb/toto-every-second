import type { TotoResult } from "./types";
import Ball from "./Ball";

interface HistoryTableProps {
  history: TotoResult[];
}

function getPrizeGroup(score: number): string {
  if (score === 1.0) return "Jackpot!";
  if (score === 0.85) return "Group 2";
  if (score === 0.7) return "Group 3";
  if (score === 0.55) return "Group 4";
  if (score === 0.4) return "Group 5";
  if (score === 0.25) return "Group 6";
  if (score === 0.1) return "Group 7";
  return "No Prize";
}

function HistoryTable({ history }: HistoryTableProps) {
  return (
    <div className="history-table">
      <table>
        <thead>
          <tr>
            <th>Game #</th>
            <th>Winning Numbers</th>
            <th>Quick Pick</th>
            <th>Result</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {history.map((result) => (
            <tr key={`toto-${result.id}`} className={result.score > 0 ? "winner-row" : ""}>
              <td>{result.id}</td>
              <td className="numbers-cell">
                <div className="balls-inline">
                  {result.draw.numbers.map((num, i) => (
                    <Ball key={`draw-${i}`} value={num} />
                  ))}
                  <span className="separator">+</span>
                  <Ball value={result.draw.additional} type="additional" />
                </div>
              </td>
              <td className="numbers-cell">
                <div className="balls-inline">
                  {result.guesses[0].numbers.map((num, i) => (
                    <Ball
                      key={`guess-${i}`}
                      value={num}
                      isMatch={result.draw.numbers.includes(num) || num === result.draw.additional}
                    />
                  ))}
                </div>
              </td>
              <td className={`score-cell ${result.score > 0 ? "winner" : ""}`}>
                {getPrizeGroup(result.score)}
              </td>
              <td className="time-cell">
                {new Date(result.timestamp).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {history.length === 0 && (
        <p className="waiting">Waiting for results...</p>
      )}
    </div>
  );
}

export default HistoryTable;
