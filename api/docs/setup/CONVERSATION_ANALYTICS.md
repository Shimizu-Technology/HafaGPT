# 📊 Conversation Analytics

Quick script to analyze conversation logs from PostgreSQL database.

## 🔍 Quick Queries

### View Recent Conversations
```sql
SELECT 
    id,
    session_id,
    timestamp,
    mode,
    LEFT(user_message, 50) as message_preview,
    used_rag,
    response_time_seconds
FROM conversation_logs
ORDER BY timestamp DESC
LIMIT 20;
```

### Total Conversations by Mode
```sql
SELECT 
    mode,
    COUNT(DISTINCT session_id) as total_conversations,
    COUNT(*) as total_messages,
    AVG(response_time_seconds) as avg_response_time
FROM conversation_logs
GROUP BY mode
ORDER BY total_conversations DESC;
```

### Most Common Questions
```sql
SELECT 
    user_message,
    COUNT(*) as frequency,
    mode
FROM conversation_logs
GROUP BY user_message, mode
HAVING COUNT(*) > 1
ORDER BY frequency DESC
LIMIT 10;
```

### RAG Usage Rate
```sql
SELECT 
    COUNT(*) FILTER (WHERE used_rag = true) * 100.0 / COUNT(*) as rag_percentage,
    COUNT(*) FILTER (WHERE used_web_search = true) * 100.0 / COUNT(*) as web_search_percentage
FROM conversation_logs;
```

### Active Hours (When do users chat most?)
```sql
SELECT 
    EXTRACT(HOUR FROM timestamp) as hour,
    COUNT(*) as messages
FROM conversation_logs
GROUP BY hour
ORDER BY hour;
```

### Conversation Length Distribution
```sql
SELECT 
    session_id,
    COUNT(*) as messages,
    MAX(timestamp) - MIN(timestamp) as duration,
    MAX(timestamp) as last_message
FROM conversation_logs
GROUP BY session_id
ORDER BY messages DESC
LIMIT 20;
```

### Average Response Time by Hour
```sql
SELECT 
    EXTRACT(HOUR FROM timestamp) as hour,
    AVG(response_time_seconds) as avg_response_time,
    COUNT(*) as message_count
FROM conversation_logs
GROUP BY hour
ORDER BY hour;
```

## 🐍 Python Analytics Script

```python
#!/usr/bin/env python3
"""
Conversation Analytics Script
Run: uv run python conversation_analytics.py
"""

import psycopg
import pandas as pd
from datetime import datetime, timedelta

def get_analytics():
    conn = psycopg.connect("postgresql://localhost/chamorro_rag")
    
    # Load all logs
    df = pd.read_sql_query(
        "SELECT * FROM conversation_logs ORDER BY timestamp",
        conn
    )
    
    conn.close()
    
    if len(df) == 0:
        print("No conversation logs yet!")
        return
    
    print("="*80)
    print("📊 CONVERSATION ANALYTICS")
    print("="*80)
    
    # Basic stats
    print(f"\n📈 Overall Stats:")
    print(f"   Total messages: {len(df):,}")
    print(f"   Total conversations: {df['session_id'].nunique():,}")
    print(f"   Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")
    
    # Mode distribution
    print(f"\n🎯 Mode Usage:")
    mode_stats = df.groupby('mode').agg({
        'session_id': 'nunique',
        'id': 'count',
        'response_time_seconds': 'mean'
    }).round(2)
    mode_stats.columns = ['Conversations', 'Messages', 'Avg Response Time']
    print(mode_stats)
    
    # RAG usage
    print(f"\n📚 RAG & Web Search Usage:")
    rag_pct = (df['used_rag'].sum() / len(df) * 100)
    web_pct = (df['used_web_search'].sum() / len(df) * 100)
    print(f"   RAG used: {rag_pct:.1f}% ({df['used_rag'].sum()} / {len(df)})")
    print(f"   Web search used: {web_pct:.1f}% ({df['used_web_search'].sum()} / {len(df)})")
    
    # Average conversation length
    print(f"\n💬 Conversation Metrics:")
    conv_lengths = df.groupby('session_id').size()
    print(f"   Avg messages per conversation: {conv_lengths.mean():.1f}")
    print(f"   Median messages per conversation: {conv_lengths.median():.0f}")
    print(f"   Longest conversation: {conv_lengths.max()} messages")
    print(f"   Shortest conversation: {conv_lengths.min()} messages")
    
    # Top questions
    print(f"\n❓ Most Common Questions:")
    top_questions = df['user_message'].value_counts().head(5)
    for i, (question, count) in enumerate(top_questions.items(), 1):
        preview = question[:60] + "..." if len(question) > 60 else question
        print(f"   {i}. ({count}x) {preview}")
    
    # Performance
    print(f"\n⚡ Performance:")
    print(f"   Avg response time: {df['response_time_seconds'].mean():.2f}s")
    print(f"   Fastest response: {df['response_time_seconds'].min():.2f}s")
    print(f"   Slowest response: {df['response_time_seconds'].max():.2f}s")
    
    print("\n" + "="*80)

if __name__ == "__main__":
    get_analytics()
```

## 📤 Export for Fine-Tuning

```python
#!/usr/bin/env python3
"""
Export conversations for OpenAI fine-tuning
Run: uv run python export_for_finetuning.py
"""

import psycopg
import json
from datetime import datetime

def export_for_finetuning():
    conn = psycopg.connect("postgresql://localhost/chamorro_rag")
    cursor = conn.cursor()
    
    # Get all conversations grouped by session
    cursor.execute("""
        SELECT session_id, user_message, bot_response, timestamp
        FROM conversation_logs
        ORDER BY session_id, timestamp
    """)
    
    rows = cursor.fetchall()
    conn.close()
    
    # Group by session
    conversations = {}
    for session_id, user_msg, bot_msg, timestamp in rows:
        if session_id not in conversations:
            conversations[session_id] = []
        conversations[session_id].append({
            "user": user_msg,
            "assistant": bot_msg
        })
    
    # Export to JSONL format for fine-tuning
    with open('chamorro_training_data.jsonl', 'w', encoding='utf-8') as f:
        for session_id, messages in conversations.items():
            # Each conversation becomes a training example
            training_example = {
                "messages": []
            }
            
            for msg in messages:
                training_example["messages"].append({
                    "role": "user",
                    "content": msg["user"]
                })
                training_example["messages"].append({
                    "role": "assistant",
                    "content": msg["assistant"]
                })
            
            f.write(json.dumps(training_example, ensure_ascii=False) + '\n')
    
    print(f"✅ Exported {len(conversations)} conversations to chamorro_training_data.jsonl")
    print(f"   Ready for fine-tuning!")

if __name__ == "__main__":
    export_for_finetuning()
```

## 🗑️ Clean Up Old Logs

```sql
-- Delete logs older than 90 days
DELETE FROM conversation_logs 
WHERE timestamp < NOW() - INTERVAL '90 days';

-- Or delete specific test sessions
DELETE FROM conversation_logs 
WHERE session_id LIKE 'test_%';
```

## 📊 View Database Size

```sql
SELECT 
    pg_size_pretty(pg_total_relation_size('conversation_logs')) as total_size,
    pg_size_pretty(pg_relation_size('conversation_logs')) as table_size,
    pg_size_pretty(pg_indexes_size('conversation_logs')) as index_size,
    COUNT(*) as total_rows
FROM conversation_logs;
```

