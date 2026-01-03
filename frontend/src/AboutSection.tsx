function AboutSection() {
  return (
    <section className="info-section">
      <h2>About This Simulator</h2>
      <p>
        This website simulates <strong>Singapore Toto</strong> draws every single second to
        demonstrate just how unlikely it is to win the lottery. Each second, we generate
        a random draw and a random guess, showing you the results in real-time.
      </p>

      <h3>Singapore Toto Rules</h3>
      <ul>
        <li>Pick <strong>6 numbers</strong> from <strong>1 to 49</strong></li>
        <li>Each draw produces <strong>6 winning numbers</strong> plus <strong>1 additional number</strong></li>
        <li>Match at least 3 numbers to win a prize</li>
        <li>The jackpot requires matching all 6 winning numbers</li>
      </ul>

      <h3>Prize Groups</h3>
      <div className="prize-table">
        <table>
          <thead>
            <tr>
              <th>Prize Group</th>
              <th>Numbers Matched</th>
              <th>Prize Amount</th>
              <th>Odds</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Group 1 (Jackpot)</td>
              <td>6 numbers</td>
              <td>S$1,000,000 (38% of pool, min)</td>
              <td>1 in 13,983,816</td>
            </tr>
            <tr>
              <td>Group 2</td>
              <td>5 numbers + additional</td>
              <td>S$100,000 (8% of pool)</td>
              <td>1 in 2,330,636</td>
            </tr>
            <tr>
              <td>Group 3</td>
              <td>5 numbers</td>
              <td>S$50,000 (5.5% of pool)</td>
              <td>1 in 55,491</td>
            </tr>
            <tr>
              <td>Group 4</td>
              <td>4 numbers + additional</td>
              <td>S$2,000 (3% of pool)</td>
              <td>1 in 22,197</td>
            </tr>
            <tr>
              <td>Group 5</td>
              <td>4 numbers</td>
              <td>S$50 (fixed)</td>
              <td>1 in 1,083</td>
            </tr>
            <tr>
              <td>Group 6</td>
              <td>3 numbers + additional</td>
              <td>S$25 (fixed)</td>
              <td>1 in 812</td>
            </tr>
            <tr>
              <td>Group 7</td>
              <td>3 numbers</td>
              <td>S$10 (fixed)</td>
              <td>1 in 61</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>The Math</h3>
      <p>
        With odds of <strong>1 in 13,983,816</strong>, if you played every second:
      </p>
      <ul>
        <li>You'd expect to hit the jackpot once every <strong>~162 days</strong> on average</li>
        <li>That's approximately <strong>5.4 months</strong> of continuous play</li>
        <li>In reality, most people play once or twice a week - at that rate, winning becomes astronomically unlikely</li>
      </ul>

      <p>
        <em>
          This simulator is for educational purposes only. It demonstrates the mathematical
          improbability of winning lottery jackpots. Please gamble responsibly.
        </em>
      </p>
    </section>
  );
}

export default AboutSection;
