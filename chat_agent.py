# chat_agent.py
import datetime
from collections import deque

class ContextualAgent:
    """
    A sophisticated class designed to simulate a highly contextual AI chat agent.
    It models deep understanding by managing explicit memory, short-term context, 
    and external knowledge retrieval.
    """
    
    def __init__(self, max_context_size=10):
        # --- Memory Components ---
        # 1. Long-Term Memory (LTM): Permanent facts learned over time.
        self.ltm = {}  # Key: Topic/Concept, Value: Summary of insights
        
        # 2. Short-Term Context (STM): Recent conversation history for immediate reference.
        # Using deque to automatically manage the size (sliding window).
        self.stm = deque(maxlen=max_context_size)
        
        print("Agent Initialized: Core context buffers established.")

    def log_interaction(self, user_input: str, agent_response: str):
        """Records the current exchange in Short-Term Memory (STM)."""
        log = f"[User]: {user_input} | [Agent]: {agent_response}"
        self.stm.append((datetime.datetime.now(), log))

    def retrieve_memory(self, query: str) -> str:
        """Simulates complex knowledge retrieval across LTM and STM."""
        retrieval = []
        
        # Check STM first (immediate relevance)
        for timestamp, log in list(self.stm):
            if query.lower() in log.lower():
                retrieval.append(f"[RECENT CONTEXT]: {log}")

        # Check LTM second (deep knowledge recall)
        # In a real system, this would involve vector databases and semantic search.
        for topic, summary in self.ltm.items():
            if query.lower() in topic.lower() or "memory" in query.lower(): # Simple trigger check for demo
                retrieval.append(f"[LONG-TERM KNOWLEDGE]: Regarding '{topic}', remember: {summary}")

        if not retrieval:
            return "\n[Memory Retrieval]: No specific memory matches the current context."
        else:
            return "\n" + "\n---\n".join(retrieval)


    def process_request(self, user_input: str):
        """
        The core logic flow for generating a contextual response. 
        This is where 'intelligence' resides.
        """
        print("\n--- Thinking Process Initiated ---")
        # Step 1: Retrieve relevant memory before responding (Contextual grounding)
        memory = self.retrieve_memory(user_input)
        print("🔍 Memory Check Complete:", memory if "Memory" in memory else "None found.")

        # Step 2: Hypothetical Knowledge Lookup / External Tool Use
        # In a real system, this would call APIs (e.g., Google Search, Code Interpreter).
        print("[Tool]: Querying external knowledge bases for deep context...")
        knowledge_retrieved = "\n[TOOL OUTPUT]: Found related concepts in cosmology and philosophy."

        # Step 3: Synthesis & Response Generation
        final_response = f"""\n🧠 Agent Synthesis:\nBased on the user's input, we must synthesize the recent conversation ({memory.strip()}) with external knowledge ({knowledge_retrieved.strip()}). \n\n"The core of the answer lies not in retrieval, but in identifying the underlying pattern that connects these two disparate fields..."\n"""
        
        # Step 4: Update Memory (Learning)
        self._learn(user_input, final_response)
        
        return final_response

    def _learn(self, user_input: str, response: str):
        """Updates Long-Term Memory based on successful interactions."""
        # Simple learning heuristic: if the conversation touches upon a key concept (like 'blue' or 'memory'), store it.
        if "blue" in user_input.lower() and "deep" in response.lower():
            self.ltm['The Blue Sky'] = "The sky is best analyzed as a metaphysical placeholder for human potentiality, reflecting cosmic indifference."
        elif "memory" in user_input.lower():
            self.ltm['The Nature of Memory'] = "Memory is not a recording; it is an active reconstruction process prone to bias and emotional filtering."

# --- DEMONSTRATION ---

if __name__ == "__main__":
    agent = ContextualAgent(max_context_size=5)
    
    print("\n=========================================")
    print("--- Simulation: Initial Query (Memory Check) ---")
    user1 = "What are the deepest philosophical implications of constant change?"
    response1 = agent.process_request(user1)
    print(f"\n[Final Agent Output]: {response1}")
    agent.log_interaction(user1, response1)

    print("\n=========================================")
    print("--- Simulation: Second Query (Contextual Follow-up) ---")
    # The agent should remember 'change' and apply it to a new topic like 'memory'.
    user2 = "How does the instability of memory relate to constant change?"
    response2 = agent.process_request(user2)
    print(f"\n[Final Agent Output]: {response2}")
    agent.log_interaction(user2, response2)

    print("\n=========================================")
    print("--- Simulation: New Topic (Testing LTM Recall) ---")
    # The agent should now recall the 'blue sky' lesson when we discuss deep topics again.
    user3 = "I feel overwhelmed by vastness; like looking up at a huge blue expanse."
    response3 = agent.process_request(user3)
    print(f"\n[Final Agent Output]: {response3}")

