$ErrorActionPreference = "Stop"
$diagrams = @{
  "01-cast" = @"
flowchart TB
    U["👤 あなた<br/>(指示)"] -->|目的を渡す| A(("🤖 Agent<br/>考えて動く"))
    A -->|参照| C["🧠 Context<br/>背景情報"]
    A -->|参照| S["📘 Skill<br/>専門マニュアル"]
    A -->|呼び出し| MCP{{"🔌 MCP<br/>共通コンセント"}}
    MCP --> T1["🔧 Fabric"]
    MCP --> T2["🔧 SharePoint"]
    MCP --> T3["🔧 Jira"]
    A -->|提出| O["📄 Output<br/>成果物"]
    O --> U
    classDef user fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef agent fill:#fff3e0,stroke:#f57c00,stroke-width:3px
    classDef tool fill:#e8f5e9,stroke:#43a047
    classDef out fill:#f3e5f5,stroke:#8e24aa
    class U user
    class A agent
    class T1,T2,T3,MCP tool
    class O,S,C out
"@

  "02-agent-loop" = @"
flowchart LR
    Plan["🗺️ Plan<br/>計画"] --> Act["🔧 Act<br/>道具を使う"]
    Act --> Obs["👀 Observe<br/>結果を見る"]
    Obs --> Ref{"🤔 十分?"}
    Ref -->|まだ| Plan
    Ref -->|完了| Out["📄 Output"]
    classDef step fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef done fill:#e8f5e9,stroke:#43a047,stroke-width:2px
    class Plan,Act,Obs step
    class Out done
"@

  "03-before-mcp" = @"
flowchart LR
    subgraph 個別連携["❌ MCP以前: N × M 個の個別接続"]
        direction LR
        A1[Copilot] -.-> B1[Fabric]
        A1 -.-> B2[Jira]
        A1 -.-> B3[GitHub]
        A1 -.-> B4[SharePoint]
        A2[Claude] -.-> B1
        A2 -.-> B2
        A2 -.-> B3
        A2 -.-> B4
        A3[Cursor] -.-> B1
        A3 -.-> B2
        A3 -.-> B3
        A3 -.-> B4
    end
    classDef agent fill:#ffebee,stroke:#c62828
    classDef tool fill:#e3f2fd,stroke:#1565c0
    class A1,A2,A3 agent
    class B1,B2,B3,B4 tool
"@

  "04-after-mcp" = @"
flowchart LR
    A1[Copilot] --> M{{"🔌 MCP<br/>共通プロトコル"}}
    A2[Claude] --> M
    A3[Cursor] --> M
    M --> B1[Fabric MCP]
    M --> B2[Jira MCP]
    M --> B3[GitHub MCP]
    M --> B4[SharePoint MCP]
    classDef agent fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef hub fill:#fff8e1,stroke:#f9a825,stroke-width:3px
    classDef tool fill:#e3f2fd,stroke:#1565c0
    class A1,A2,A3 agent
    class M hub
    class B1,B2,B3,B4 tool
"@

  "05-evolution" = @"
flowchart LR
    G1["🔍 検索エンジン<br/><br/>キーワード<br/>↓<br/>リンク一覧"] --> G2["💬 ChatGPT<br/><br/>質問<br/>↓<br/>回答"]
    G2 --> G3["🤖 AIエージェント<br/><br/>目的<br/>↓<br/>完了した仕事"]
    classDef old fill:#f5f5f5,stroke:#9e9e9e
    classDef mid fill:#e3f2fd,stroke:#1976d2
    classDef new fill:#fff3e0,stroke:#f57c00,stroke-width:3px
    class G1 old
    class G2 mid
    class G3 new
"@

  "06-mcp-vs-skills" = @"
flowchart TB
    subgraph 比較[" "]
        direction LR
        subgraph MCP_Side["🔌 MCP = 道路・コンセント"]
            M1[ツールに繋ぐ規格]
            M2[誰が作る: ITやISV]
            M3[例: Fabric MCPサーバ]
        end
        subgraph Skill_Side["📘 Skill = 運転マニュアル"]
            S1[使い方の知識]
            S2[誰が作る: 業務の専門家]
            S3[例: ブランド審査手順]
        end
    end
    AND[("両方そろって<br/>初めて戦力化")]
    MCP_Side --> AND
    Skill_Side --> AND
    classDef mcp fill:#fff8e1,stroke:#f9a825
    classDef skill fill:#f3e5f5,stroke:#8e24aa
    classDef and fill:#e8f5e9,stroke:#2e7d32,stroke-width:3px
    class M1,M2,M3 mcp
    class S1,S2,S3 skill
    class AND and
"@

  "07-flow-sequence" = @"
sequenceDiagram
    autonumber
    participant U as 👤 あなた
    participant A as 🤖 Agent
    participant F as 🔧 Fabric
    participant W as 🔧 Word
    U->>A: Q2施策を作って
    A->>A: 計画
    A->>F: クエリ実行
    F-->>A: 売上データ (Tool Output)
    A->>A: 分析
    A->>W: ドラフト作成
    W-->>A: docxパス (Tool Output)
    A-->>U: 完成ドラフト + 根拠 (Agent Output)
"@

  "08-usecase" = @"
flowchart TB
    U["👤 マーケター<br/>クリエイティブ案を提出"] --> A(("🤖 Brand<br/>Guardian<br/>Agent"))
    A --> SK1["📘 Brand Guidelines"]
    A --> SK2["📘 各国規制ルール"]
    A --> MCP{{"🔌 MCP"}}
    MCP --> F["Fabric: ID-POS / VoC"]
    MCP --> SP["DAM (SharePoint)"]
    MCP --> AD["Adobe Workfront"]
    A --> O["📄 ブランド適合スコア<br/>+ 改善コメント"]
    O --> U
    U --> H{"人間が<br/>最終承認"}
    classDef user fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef agent fill:#fff3e0,stroke:#f57c00,stroke-width:3px
    classDef approve fill:#ffebee,stroke:#c62828,stroke-width:2px
    class U user
    class A agent
    class H approve
"@
}

foreach ($k in $diagrams.Keys) {
  $body = $diagrams[$k]
  $out = "assets\img\$k.svg"
  Write-Host "Generating $out ..."
  try {
    $resp = Invoke-WebRequest -Uri "https://kroki.io/mermaid/svg" -Method POST -Body $body -ContentType "text/plain; charset=utf-8" -UseBasicParsing
    $svg = if ($resp.Content -is [byte[]]) { [System.Text.Encoding]::UTF8.GetString($resp.Content) } else { $resp.Content }
    Set-Content -Path $out -Value $svg -Encoding utf8 -NoNewline
    Write-Host "  OK ($($svg.Length) chars)"
  } catch {
    Write-Host "  FAIL: $_"
  }
}
