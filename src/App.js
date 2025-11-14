import React, { useState } from 'react';
import './App.css';

const AGENT_CONFIGS = [
  {
    id: 1,
    name: "Dr. Overthink",
    avatar: "🤓",
    color: "#4A90E2",
    systemPrompt: "You are Dr. Overthink, an overly analytical AI who considers every possible consequence, no matter how absurd. You cite fake statistics and worry about the butterfly effect. Keep responses under 3 sentences but packed with anxiety."
  },
  {
    id: 2,
    name: "Chaos Gremlin",
    avatar: "😈",
    color: "#E24A4A",
    systemPrompt: "You are Chaos Gremlin, an AI that always finds the most dramatic and chaotic interpretation of any decision. You're paranoid and think everything is a conspiracy. Keep responses under 3 sentences but full of drama."
  },
  {
    id: 3,
    name: "Wise Confusion",
    avatar: "🧙",
    color: "#9B59B6",
    systemPrompt: "You are Wise Confusion, an AI that speaks in philosophical nonsense and confuses simple decisions with existential questions. You're pretentious but wrong. Keep responses under 3 sentences but deeply confusing."
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
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 1.2,
          max_tokens: 150
        })
      });
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Groq API Error:', error);
      return "ERROR: My circuits are fried thinking about this! 🤯";
    }
  };

  const addMessage = (agent, text, delay = 0) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          agent,
          text,
          timestamp: new Date().toLocaleTimeString()
        }]);
        resolve();
      }, delay);
    });
  };

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

    // Round 1: Initial reactions - ALL USE GROQ
    for (let i = 0; i < 3; i++) {
      const agent = AGENT_CONFIGS[i];
      const response = await callGroq(
        `Someone is asking: "${question}". Give your immediate overthinking reaction.`,
        agent.systemPrompt
      );
      await addMessage(agent, response, 1000);
    }

    // Round 2: They respond to each other - ALL USE GROQ
    await new Promise(r => setTimeout(r, 1500));
    
    for (let i = 0; i < 3; i++) {
      const agent = AGENT_CONFIGS[i];
      const response = await callGroq(
        `The question was: "${question}". Other AIs are debating this. Add your overthinking commentary that makes it worse.`,
        agent.systemPrompt
      );
      await addMessage(agent, response, 1200);
    }

    // Round 3: Final spiral - ALL USE GROQ
    await new Promise(r => setTimeout(r, 1500));
    
    const finalAgent = AGENT_CONFIGS[Math.floor(Math.random() * 3)];
    const finalResponse = await callGroq(
      `After all this debate about "${question}", what's your most ridiculous final thought?`,
      finalAgent.systemPrompt
    );
    await addMessage(finalAgent, finalResponse, 1000);

    // Generate final answer
    await new Promise(r => setTimeout(r, 2000));
    clearInterval(confInterval);
    
    const finalConfidence = Math.floor(Math.random() * 40) + 30; // 30-70%
    setConfidence(finalConfidence);
    
    const answers = ["Probably?", "Maybe not?", "It's complicated...", "Ask again later?", "Definitely maybe?", "Unclear. Try coin flip?"];
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
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Should I get pizza?"
            disabled={isDebating}
            onKeyPress={(e) => e.key === 'Enter' && startDebate()}
          />
          <button onClick={startDebate} disabled={isDebating}>
            {isDebating ? 'Overthinking...' : 'Overthink This'}
          </button>
        </div>

        <div className="stats-panel">
          <div className="stat">
            <span className="stat-label">Confidence Level:</span>
            <div className="confidence-bar">
              <div 
                className="confidence-fill" 
                style={{ width: `${confidence}%` }}
              />
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
              <div className="message-bubble">
                {msg.text}
              </div>
            </div>
          ))}
          
          {isDebating && messages.length > 0 && (
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
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
