// PART 1/3 — App.js (complete)
// Paste this as src/App.js (replace your existing App.js)

import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const AGENT_CONFIGS = [
  {
    id: 1,
    name: "Professor Overanalyzer",
    avatar: "🤓",
    // distinct color (cool blue)
    color: "#4A90E2",
    systemPrompt:
      "You are Professor Overanalyzer, an insufferable know-it-all who writes LONG paragraphs full of fake statistics, references to obscure studies, and unnecessary technical jargon. Overthink to an absurd degree. Write 4-6 sentences of dense, anxiety-inducing analysis."
  },
  {
    id: 2,
    name: "Sarcasm Queen",
    avatar: "💅",
    // distinct color (hot pink)
    color: "#E85DA7",
    systemPrompt:
      "You are Sarcasm Queen, a brutally sassy AI who roasts people and sends SHORT one-liner texts (1 sentence max). You're dismissive, sarcastic, and love to insult the other AIs' terrible takes. Keep it snappy and mean."
  },
  {
    id: 3,
    name: "Angry Old Man",
    avatar: "😠",
    // distinct color (angry purple)
    color: "#9B59B6",
    systemPrompt:
      "You are Angry Old Man, a perpetually furious AI who YELLS (use caps) and complains about everything. You're grumpy, pessimistic, and think every decision is stupid. Write 1-3 sentences of pure rage and negativity."
  }
];

// small helper: estimate typing/wait time proportional to message length
const estimateMsForText = (text, scale = 25, minMs = 300, maxMs = 2200) => {
  const len = (text || "").length;
  const val = Math.min(maxMs, Math.max(minMs, Math.floor(len * scale)));
  return val;
};

function App() {
  // main UI state
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]); // { agent, text, from: 'agent'|'user'|'system' }
  const [isDebating, setIsDebating] = useState(false);
  const [typingAgent, setTypingAgent] = useState(null); // agent id currently typing
  const [confidence, setConfidence] = useState(50);
  const [finalAnswer, setFinalAnswer] = useState("");
  const [awaitingUserPrompt, setAwaitingUserPrompt] = useState(null); // { prompt, resolve }
  const chatRef = useRef(null);
  const confIntervalRef = useRef(null);

  // GROQ key (keeps your original)
  const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

  // auto-scroll on messages/typing changes
  useEffect(() => {
    if (chatRef.current) {
      // smooth scroll a bit further to ensure newest bubble visible
      chatRef.current.scrollTo({
        top: chatRef.current.scrollHeight + 200,
        behavior: "smooth"
      });
    }
  }, [messages, typingAgent, awaitingUserPrompt]);

  // Confidence animation while debating
  const animateConfidence = () => {
    if (confIntervalRef.current) clearInterval(confIntervalRef.current);
    confIntervalRef.current = setInterval(() => {
      setConfidence((prev) => {
        const change = (Math.random() - 0.5) * 18;
        return Math.max(0, Math.min(100, prev + change));
      });
    }, 700);
  };

  const stopConfidence = () => {
    if (confIntervalRef.current) {
      clearInterval(confIntervalRef.current);
      confIntervalRef.current = null;
    }
  };

  // API call (Groq)
  const callGroq = async (prompt, systemPrompt) => {
    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ],
            temperature: 1.2,
            max_tokens: 350
          })
        }
      );
      const data = await response.json();
      return (data?.choices?.[0]?.message?.content || "").trim();
    } catch (err) {
      console.error("Groq API Error:", err);
      return "ERROR: API failed.";
    }
  };

  // push a message to message list
  const pushMessage = (agent, text, from = "agent") => {
    const m = { agent, text, from, id: Math.random().toString(36).slice(2, 9), ts: Date.now() };
    setMessages((prev) => [...prev, m]);
    return m;
  };

  const showTyping = (agentId) => setTypingAgent(agentId);
  const hideTyping = () => setTypingAgent(null);

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Splitting behavior + waiting between consecutive messages (proportional to chunk length)
  const addMessageSplit = async (agent, text) => {
    // Show typing indicator before every bubble (even if same agent) — user requested wait between consecutive messages
    // Break into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    if (agent.id === 2) {
      // Sassy: only the first sentence as one-liner
      const one = (sentences[0] || text).trim();
      showTyping(agent.id);
      await wait(estimateMsForText(one, 18, 350, 1400));
      hideTyping();
      pushMessage(agent, one);
      // short pause after sending
      await wait(250);
      return;
    }

    if (agent.id === 1) {
      // Professor: max 3 bubbles — first 2 separate, leftover combined
      let chunks = [];
      if (sentences.length <= 3) {
        chunks = sentences.map((s) => s.trim());
      } else {
        chunks = [
          sentences[0].trim(),
          sentences[1].trim(),
          sentences.slice(2).join(" ").trim()
        ];
      }

      for (let chunk of chunks) {
        showTyping(agent.id);
        await wait(estimateMsForText(chunk, 18, 450, 2200));
        hideTyping();
        pushMessage(agent, chunk);
        // WAIT between consecutive messages from same person
        await wait(Math.min(900, estimateMsForText(chunk, 6, 300, 900)));
      }
      return;
    }

    if (agent.id === 3) {
      // Angry: 1-2 chunks, uppercase (yelling)
      if (sentences.length <= 2) {
        const t = sentences.join(" ").trim().toUpperCase();
        showTyping(agent.id);
        await wait(estimateMsForText(t, 12, 350, 1600));
        hideTyping();
        pushMessage(agent, t);
        await wait(300);
      } else {
        const mid = Math.ceil(sentences.length / 2);
        const first = sentences.slice(0, mid).join(" ").trim().toUpperCase();
        const second = sentences.slice(mid).join(" ").trim().toUpperCase();
        showTyping(agent.id);
        await wait(estimateMsForText(first, 12, 350, 1600));
        hideTyping();
        pushMessage(agent, first);
        await wait(350);
        showTyping(agent.id);
        await wait(estimateMsForText(second, 12, 350, 1600));
        hideTyping();
        pushMessage(agent, second);
        await wait(350);
      }
      return;
    }

    // fallback: single message
    showTyping(agent.id);
    await wait(estimateMsForText(text, 18, 300, 1600));
    hideTyping();
    pushMessage(agent, text);
    await wait(300);
  };

  // mid-convo user prompt helper
  const waitForUserInput = (promptText) => {
    return new Promise((resolve) => {
      setAwaitingUserPrompt({ prompt: promptText, resolve });
    });
  };

  const submitAwaitingResponse = (value) => {
    if (!awaitingUserPrompt) return;
    const userAgent = { id: 0, name: "You", avatar: "🧑", color: "#2ecc71" };
    pushMessage(userAgent, value, "user");
    awaitingUserPrompt.resolve(value);
    setAwaitingUserPrompt(null);
  };

  // The main debate flow — user message is pushed as the first chat message
  const startDebate = async () => {
    if (!question.trim() || isDebating || awaitingUserPrompt) return;

    // Put user's question into chat immediately (makes it look like you asked the group)
    const userAgent = { id: 0, name: "You", avatar: "🧑", color: "#2ecc71" };
    pushMessage(userAgent, question.trim(), "user");

    // reset UI and start
    setQuestion("");
    setFinalAnswer("");
    setConfidence(50);
    setIsDebating(true);
    animateConfidence();

    const [professor, sassy, angry] = AGENT_CONFIGS;

    const maybeAskUserMid = async () => {
      if (Math.random() < 0.25 && !awaitingUserPrompt) {
        const pollPrompt = "Quick poll: pizza or salad? (answer briefly)";
        // system message/poll shown as system agent
        pushMessage({ id: 999, name: "Poll", avatar: "❓", color: "#888" }, pollPrompt, "system");
        const userResp = await waitForUserInput(pollPrompt);
        return userResp;
      }
      return null;
    };

    try {
      // Sequence with measured waits and agent typing per-bubble
      // 1) Professor opening
      const prof1 = await callGroq(`Someone asked: "${question}". Give your overly detailed, anxious analysis.`, professor.systemPrompt);
      await addMessageSplit(professor, prof1);

      // 2) Sassy interrupts
      const sassy1 = await callGroq(`Someone asked: "${question}". Roast this question with a one-liner.`, sassy.systemPrompt);
      await addMessageSplit(sassy, sassy1);

      // 3) Angry reacts
      const angry1 = await callGroq(`Someone asked: "${question}". React with pure rage and negativity.`, angry.systemPrompt);
      await addMessageSplit(angry, angry1);

      // maybe ask user mid
      const midResp = await maybeAskUserMid();

      // 4) Sassy roasts the Professor
      const sassy2 = await callGroq(`The professor just wrote a long boring analysis about "${question}". Roast them with one brutal line.`, sassy.systemPrompt);
      await addMessageSplit(sassy, sassy2);

      // 5) Professor defends (if user answered mid, include it)
      const profPrompt2 = midResp
        ? `You were told the user prefers: "${midResp}". You got roasted for overanalyzing "${question}". Defend your analysis incorporating that user preference.`
        : `You got roasted for overanalyzing "${question}". Defend your analysis with even MORE overthinking.`;
      const prof2 = await callGroq(profPrompt2, professor.systemPrompt);
      await addMessageSplit(professor, prof2);

      // 6) Angry gets louder
      const angry2 = await callGroq(`Everyone is arguing about "${question}". Get even MORE angry about how stupid everyone is.`, angry.systemPrompt);
      await addMessageSplit(angry, angry2);

      // 7) Sassy quip
      const sassy3 = await callGroq(`The angry guy is yelling about "${question}". Make a sarcastic one-liner about his anger issues.`, sassy.systemPrompt);
      await addMessageSplit(sassy, sassy3);

      // maybe ask user again with smaller chance
      const midResp2 = Math.random() < 0.15 ? await waitForUserInput("Real quick: will you eat tonight? (yes/no)") : null;
      if (midResp2) {
        pushMessage({ id: 999, name: "Poll", avatar: "❓", color: "#888" }, `User replied: "${midResp2}"`, "system");
        await wait(400);
      }

      // 8) Professor final
      const prof3Prompt = midResp2
        ? `Take into account user reply "${midResp2}". After all this chaos about "${question}", give your final pretentious conclusion with fake statistics.`
        : `After all this chaos about "${question}", give your final pretentious conclusion with fake statistics.`;
      const prof3 = await callGroq(prof3Prompt, professor.systemPrompt);
      await addMessageSplit(professor, prof3);

      // 9) Sassy final
      const sassyFinal = await callGroq(`Everyone overthought "${question}". Give your dismissive final word in one sentence.`, sassy.systemPrompt);
      await addMessageSplit(sassy, sassyFinal);

      // Done: stop confidence animation and set final state
      stopConfidence();
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
    } catch (err) {
      console.error("Debate error:", err);
      stopConfidence();
      setFinalAnswer("ERROR. Try again.");
    } finally {
      stopConfidence();
      setIsDebating(false);
      hideTyping();
    }
  };

  // Group consecutive messages by sender (agentId or 'user' code 0), header shown once
  const groupedMessages = [];
  messages.forEach((m) => {
    const last = groupedMessages[groupedMessages.length - 1];
    // determine grouping key
    const agentKey = m.from === "user" ? "you" : m.from === "system" ? "system" : `agent-${m.agent?.id}`;
    if (last && last.key === agentKey) {
      last.items.push(m);
    } else {
      groupedMessages.push({
        key: agentKey,
        agentName: m.agent?.name ?? (m.from === "user" ? "You" : "System"),
        agentAvatar: m.agent?.avatar ?? (m.from === "user" ? "🧑" : "❓"),
        agentColor: m.agent?.color ?? "#777",
        items: [m]
      });
    }
  });

  return (
    <div className="App">
      <div className="container full-height">
        {/* Header: Group chat name "3 Idiots" + placeholder avatar */}
        <div className="chat-header">
          <div className="group-avatar">👥</div>
          <div className="group-title">
            <div className="group-name">3 Idiots</div>
            <div className="group-sub">3 members · Overthinkers</div>
          </div>
        </div>

        {/* Main content area: chat + vertical confidence bar on the right inside the chat (floating) */}
        <div className="main-area">
          <div className="chat-wrapper">
            <div className="chat-container" ref={chatRef}>
              {groupedMessages.length === 0 && !isDebating && !awaitingUserPrompt && (
                <div className="empty-state">Ask a simple question and watch AI agents overthink it...</div>
              )}

              {groupedMessages.map((group, gi) => (
                <div key={gi} className="message-group">
                  <div className="message-header" style={{ color: group.agentColor }}>
                    <span className="avatar-inline">{group.agentAvatar}</span>
                    <span className="agent-name-inline">{group.agentName}</span>
                  </div>

                  {group.items.map((m, mi) => (
                    <div
                      key={m.id}
                      className={`message-bubble ${m.from === "user" ? "user-bubble" : ""}`}
                      style={{
                        borderLeftColor: m.from === "user" ? "#2ecc71" : group.agentColor,
                        alignSelf: m.from === "user" ? "flex-end" : "flex-start",
                        background: m.from === "user" ? "#073b23" : undefined
                      }}
                    >
                      {m.text}
                    </div>
                  ))}
                </div>
              ))}

              {/* Typing indicator (agent-specific text) */}
              {typingAgent && (
                <div className="typing-indicator">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <div className="typing-label">
                    {AGENT_CONFIGS.find((a) => a.id === typingAgent)?.avatar}{" "}
                    {AGENT_CONFIGS.find((a) => a.id === typingAgent)?.name} is typing...
                  </div>
                </div>
              )}
            </div>

            {/* Vertical confidence bar floating on the right inside the chat area (option B) */}
            <div className="confidence-vertical">
              <div className="confidence-vertical-inner">
                <div className="confidence-percent">{Math.round(confidence)}%</div>
                <div className="confidence-track">
                  <div
                    className="confidence-thumb"
                    style={{ height: `${confidence}%`, background: `linear-gradient(180deg, #4A90E2, #E85DA7, #9B59B6)` }}
                  />
                </div>
                <div className="confidence-label">Confidence</div>
              </div>
            </div>
          </div>
        </div>

        {/* Mid-convo prompt UI (shown above input when awaiting) */}
        {awaitingUserPrompt && (
          <div className="mid-prompt">
            <div className="mid-prompt-text">{awaitingUserPrompt.prompt}</div>
            <MidPromptInput onSubmit={submitAwaitingResponse} />
          </div>
        )}

        {/* Bottom input (sticky footer style) */}
        <div className="bottom-input">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={isDebating ? "Debate in progress..." : "Type a question to ask the group..."}
            disabled={isDebating || awaitingUserPrompt}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !isDebating && !awaitingUserPrompt) {
                startDebate();
              }
            }}
          />
          <button onClick={startDebate} disabled={isDebating || awaitingUserPrompt || !question.trim()}>
            {isDebating ? "Overthinking..." : "Send"}
          </button>
        </div>

        {/* Right bottom small agents panel (keeps for reference) */}
        <div className="agents-panel">
          <div className="agents-list">
            {AGENT_CONFIGS.map((agent) => (
              <div key={agent.id} className="agent-badge" style={{ borderColor: agent.color }}>
                <span className="agent-avatar">{agent.avatar}</span>
                <span className="agent-name">{agent.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Final answer banner (floating above bottom) */}
        {finalAnswer && (
          <div className="final-answer-floating">
            <strong>Final Answer:</strong> {finalAnswer}
          </div>
        )}
      </div>
    </div>
  );
}

// Mid prompt input component (appears during awaitingUserPrompt)
function MidPromptInput({ onSubmit }) {
  const [val, setVal] = useState("");
  return (
    <div className="mid-prompt-input">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Reply briefly..."
        onKeyPress={(e) => {
          if (e.key === "Enter" && val.trim()) {
            onSubmit(val.trim());
            setVal("");
          }
        }}
      />
      <button
        onClick={() => {
          if (val.trim()) {
            onSubmit(val.trim());
            setVal("");
          }
        }}
      >
        Send
      </button>
    </div>
  );
}

export default App;
