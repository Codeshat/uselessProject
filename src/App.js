import React, { useState } from 'react';
import './App.css';

const AGENT_CONFIGS = [
  {
    id: 1,
    name: "Professor Overanalyzer",
    avatar: "🤓",
    color: "#4A90E2",
    systemPrompt:
      "You are Professor Overanalyzer, an insufferable know-it-all who writes LONG paragraphs full of fake statistics, references to obscure studies, and unnecessary technical jargon. You overthink everything to an absurd degree. Write 4-6 sentences of dense, anxiety-inducing analysis."
  },
  {
    id: 2,
    name: "Sarcasm Queen",
    avatar: "💅",
    color: "#E24A4A",
    systemPrompt:
      "You are Sarcasm Queen, a brutally sassy AI who roasts people and sends SHORT one-liner texts (1 sentence max). You're dismissive, sarcastic, and love to insult the other AIs' terrible takes. Keep it snappy and mean."
  },
  {
    id: 3,
    name: "Angry Old Man",
    avatar: "😠",
    color: "#9B59B6",
    systemPrompt:
      "You are Angry Old Man, a perpetually furious AI who YELLS (use caps) and complains about everything. You're grumpy, pessimistic, and think every decision is stupid. Write 2-3 sentences of pure rage and negativity."
  }
];

function App() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [isDebating, setIsDebating] = useState(false);
  const [confidence, setConfidence] = useState(50);
  const [finalAnswer, setFinalAnswer] = useState('');

  const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

  const callGroq = async (prompt, systemPrompt) => {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 1.3,
          max_tokens: 200
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Groq API Error:', error);
      return "ERROR: I broke 🤯";
    }
  };

  const addMessage = (agent, text, delay = 0) => {
    return new Promise(resolve => {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { agent, text, timestamp: new Date().toLocaleTimeString() }
        ]);
        resolve();
      }, delay);
    });
  };

  // -----------------------------------------------------------
  // UPDATED MESSAGE SPLITTING LOGIC
  // -----------------------------------------------------------

  const addMessageSplit = async (agent, text, baseDelay = 0) => {
    // Sassy never splits
    if (agent.id === 2) {
      await addMessage(agent, text, baseDelay);
      return;
    }

    // PROFESSOR — natural sentence splits, MAX 3 bubbles
    if (agent.id === 1) {
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

      const MAX_BUBBLES = 3;
      let chunks = [];

      if (sentences.length <= MAX_BUBBLES) {
        chunks = sentences.map(s => s.trim());
      } else {
        chunks = [
          sentences[0].trim(),
          sentences[1].trim(),
          sentences.slice(2).join(" ").trim() // combine the rest
        ];
      }

      for (let i = 0; i < chunks.length; i++) {
        await addMessage(agent, chunks[i], baseDelay + i * 800);
      }
      return;
    }

    // ANGRY OLD MAN — split by sentences into 1–2 chunks
    if (agent.id === 3) {
      const parts = text.match(/[^.!?]+[.!?]+/g) || [text];

      if (parts.length <= 2) {
        await addMessage(agent, text, baseDelay);
        return;
      }

      const mid = Math.ceil(parts.length / 2);
      const first = parts.slice(0, mid).join(" ").trim();
      const second = parts.slice(mid).join(" ").trim();

      await addMessage(agent, first, baseDelay);
      await addMessage(agent, second, baseDelay + 600);
      return;
    }

    // fallback for any future agents
    await addMessage(agent, text, baseDelay);
  };

  // -----------------------------------------------------------

  const animateConfidence = () => {
    const interval = setInterval(() => {
      setConfidence(prev => {
        const change = (Math.random() - 0.5) * 30;
        return Math.max(0, Math.min(100, prev + change));
      });
    }, 800);

    return interval;
  };

  const startDebate = async () => {
    if (!question.trim()) return;

    setMessages([]);
    setIsDebating(true);
    setFinalAnswer('');
    setConfidence(50);

    const confInterval = animateConfidence();

    const professor = AGENT_CONFIGS[0];
    const sassy = AGENT_CONFIGS[1];
    const angry = AGENT_CONFIGS[2];

    // Professor first
    const profResponse1 = await callGroq(
      `Someone asked: "${question}". Give your overly detailed, anxious analysis.`,
      professor.systemPrompt
    );
    await addMessageSplit(professor, profResponse1, 500);

    await new Promise(r => setTimeout(r, 1000));

    // Sassy interrupt
    const sassyResponse1 = await callGroq(
      `Someone asked: "${question}". Roast this question with a one-liner.`,
      sassy.systemPrompt
    );
    await addMessage(sassy, sassyResponse1, 200);

    await new Promise(r => setTimeout(r, 800));

    // Angry reacts
    const angryResponse1 = await callGroq(
      `Someone asked: "${question}". React with pure rage and negativity.`,
      angry.systemPrompt
    );
    await addMessageSplit(angry, angryResponse1, 300);

    await new Promise(r => setTimeout(r, 1000));

    // Sassy roasting professor
    const sassyResponse2 = await callGroq(
      `The professor just wrote a long boring analysis about "${question}". Roast them with one brutal line.`,
      sassy.systemPrompt
    );
    await addMessage(sassy, sassyResponse2, 200);

    await new Promise(r => setTimeout(r, 1200));

    // Professor defends with more overthinking
    const profResponse2 = await callGroq(
      `You got roasted for overanalyzing "${question}". Defend your analysis with even MORE overthinking.`,
      professor.systemPrompt
    );
    await addMessageSplit(professor, profResponse2, 400);

    await new Promise(r => setTimeout(r, 1000));

    // Angry gets louder
    const angryResponse2 = await callGroq(
      `Everyone is arguing about "${question}". Get even MORE angry about how stupid everyone is.`,
      angry.systemPrompt
    );
    await addMessageSplit(angry, angryResponse2, 300);

    await new Promise(r => setTimeout(r, 800));

    // Sassy again
    const sassyResponse3 = await callGroq(
      `The angry guy is yelling about "${question}". Make a sarcastic one-liner about his anger issues.`,
      sassy.systemPrompt
    );
    await addMessage(sassy, sassyResponse3, 200);

    await new Promise(r => setTimeout(r, 1000));

    // Professor final overthought conclusion
    const profResponse3 = await callGroq(
      `After all this chaos about "${question}", give your final pretentious conclusion with fake statistics.`,
      professor.systemPrompt
    );
    await addMessageSplit(professor, profResponse3, 500);

    await new Promise(r => setTimeout(r, 1200));

    // Final sassy line
    const sassyFinal = await callGroq(
      `Everyone overthought "${question}". Give your dismissive final word in one sentence.`,
      sassy.systemPrompt
    );
    await addMessage(sassy, sassyFinal, 200);

    await new Promise(r => setTimeout(r, 2000));
    clearInterval(confInterval);

    const finalConfidence = Math.floor(Math.random() * 40) + 30;
    setConfidence(finalConfidence);

    const answers = [
      "Probably?",
      "Maybe not?",
      "It's complicated...",
      "Ask again later?",
      "Definitely maybe?",
      "Unclear. Try coin flip?",
      "We have no idea lol",
      "Don't ask us"
    ];

    setFinalAnswer(answers[Math.floor(Math.random() * answers.length)]);
    setIsDebating(false);
  };

  return (
    <div className="App">
      <div className="container">
        <h1>🧠 The Overthinker</h1>
        <p className="subtitle">Where simple questions go to die</p>

        <div className="input-section">
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Should I get pizza?"
            disabled={isDebating}
            onKeyPress={e => e.key === 'Enter' && startDebate()}
          />
          <button onClick={startDebate} disabled={isDebating}>
            {isDebating ? 'Overthinking...' : 'Overthink This'}
          </button>
        </div>

        <div className="stats-panel">
          <div className="stat">
            <span className="stat-label">Confidence Level:</span>
            <div className="confidence-bar">
              <div className="confidence-fill" style={{ width: `${confidence}%` }} />
            </div>
            <span className="stat-value">{confidence.toFixed(0)}%</span>
          </div>

          {finalAnswer && (
            <div className="final-answer">
              <h3>Final Answer:</h3>
              <p>{finalAnswer}</p>
            </div>
          )}
        </div>

        <div className="chat-container">
          {messages.length === 0 && !isDebating && (
            <div className="empty-state">
              Ask a simple question and watch AI agents overthink it...
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className="message" style={{ '--agent-color': msg.agent.color }}>
              <div className="message-header">
                <span className="avatar">{msg.agent.avatar}</span>
                <span className="agent-name">{msg.agent.name}</span>
                <span className="timestamp">{msg.timestamp}</span>
              </div>
              <div className="message-bubble">{msg.text}</div>
            </div>
          ))}

          {isDebating && messages.length > 0 && (
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          )}
        </div>

        <div className="agents-panel">
          <h4>Active Agents:</h4>
          <div className="agents-list">
            {AGENT_CONFIGS.map(agent => (
              <div key={agent.id} className="agent-badge">
                <span>{agent.avatar}</span>
                <span>{agent.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
