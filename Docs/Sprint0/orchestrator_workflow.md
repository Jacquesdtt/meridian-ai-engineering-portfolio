# The Orchestrator Workflow: AI-Augmented Engineering

This diagram visualizes your exact workflow as the human Orchestrator collaborating with an AI Agent in a heavily constrained enterprise environment.

```mermaid
graph TD
    classDef ai fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#000
    classDef human fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#000
    classDef stakeholder fill:#e8f5e9,stroke:#388e3c,stroke-width:2px,color:#000
    classDef system fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000

    A["AI Agent - Drafts Code, Architecture and Plans"]:::ai
    B{"Friction Gate (Human Plan Review)"}:::human
    C["Split-Workflow Execution (Native IDE)"]:::human
    D["Review Outputs (EDA, Model Metrics, Errors)"]:::human
    E["Stakeholder Bridging (Meetings with Sam, Jamie)"]:::human
    F["Business Stakeholders (Provide Constraints)"]:::stakeholder
    G["Enterprise Systems (Azure, FastAPI, GitHub)"]:::system

    A -- Submits Implementation Plan --> B
    B -- Rejects or Iterates --> A
    B -- Approves and Proceeds --> C
    
    C -- Executes Code Bypassing AppLocker --> G
    G -- Returns Data or Logs --> D
    
    D -- Feeds Data into Meeting Prep --> E
    E -- Negotiates and Aligns --> F
    F -- Returns Business Logic --> E
    
    E -- Provides New Constraints --> A
    D -- Feeds Errors or Results --> A
```

### Key Workflow Pillars:

1. **The Friction Gate:** You intentionally slow down the AI to ensure all architectural decisions meet enterprise standards before execution.
2. **The Split-Workflow:** You act as the bridge between the AI's sandboxed environment and the actual local Windows hardware, bypassing corporate restrictions like AppLocker safely.
3. **Stakeholder Translation:** You are the human interface that translates raw data into business value, negotiating definitions (like "Churn") with actual leadership before bringing those rules back to the codebase.
