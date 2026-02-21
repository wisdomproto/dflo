# AI 모델 선택 및 학습 가이드

## 🎯 모델 선택 가이드

### 옵션 비교표

| 모델 | 비용 | 성능 | 커스텀 | 한국어 | 난이도 | 권장도 |
|------|------|------|--------|--------|--------|--------|
| **OpenAI GPT-4** | 💰💰💰 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 쉬움 | ⭐⭐⭐⭐⭐ |
| **OpenAI GPT-3.5** | 💰💰 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 쉬움 | ⭐⭐⭐⭐ |
| **Google Gemini Pro** | 💰 | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | 쉬움 | ⭐⭐⭐⭐⭐ |
| **Claude 3** | 💰💰 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | 쉬움 | ⭐⭐⭐⭐ |
| **오픈소스 (Llama 3)** | 무료 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 어려움 | ⭐⭐ |

---

## 🏆 권장: Google Gemini Pro + RAG

### 왜 Gemini인가?
1. ✅ **무료 할당량 많음**: 월 45,000 요청
2. ✅ **한국어 성능 우수**: 네이티브 지원
3. ✅ **긴 컨텍스트**: 32K 토큰
4. ✅ **빠른 응답**: 실시간 상담 가능
5. ✅ **RAG 최적화**: 문서 검색 통합 용이

---

## 📚 RAG (Retrieval-Augmented Generation) 방식

### RAG란?
> AI가 답변할 때 **관련 문서를 먼저 검색**한 후, 그 정보를 바탕으로 답변 생성

```
사용자 질문
    ↓
벡터 데이터베이스에서 관련 문서 검색
    ↓
검색된 문서 + 질문 → AI에게 전달
    ↓
AI가 문서 기반으로 답변 생성
```

### 왜 RAG인가?
- ✅ Fine-tuning 불필요 (비용 절감)
- ✅ 데이터 업데이트 쉬움
- ✅ 출처 명확 (신뢰성)
- ✅ 환각(Hallucination) 감소

---

## 🔧 구현 방법 1: Google Gemini + RAG (권장)

### 시스템 구조
```
┌─────────────┐
│ 사용자 질문  │
└──────┬──────┘
       ↓
┌──────────────────┐
│ 벡터 검색 엔진    │ ← 성장 데이터 임베딩
│ (Pinecone/Chroma) │
└──────┬───────────┘
       ↓
┌──────────────────┐
│ 관련 문서 5개     │
└──────┬───────────┘
       ↓
┌──────────────────┐
│ Gemini API        │ ← 시스템 프롬프트 + 문서 + 질문
└──────┬───────────┘
       ↓
┌──────────────────┐
│ AI 답변 생성      │
└──────────────────┘
```

### 필요한 서비스:
1. **Vector DB**: Pinecone (무료) 또는 Chroma (로컬)
2. **Embedding**: OpenAI text-embedding-3-small
3. **LLM**: Google Gemini Pro
4. **프록시**: Cloudflare Workers

---

## 💻 실전 코드: RAG 구현

### 1. 데이터 임베딩 (Python)

```python
# requirements.txt
# openai
# pinecone-client
# pandas

import openai
import pinecone
import json

# OpenAI 임베딩 생성
openai.api_key = "YOUR_OPENAI_API_KEY"

def create_embedding(text):
    response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

# 데이터 로드
with open('data/training/faq.json', 'r', encoding='utf-8') as f:
    faqs = json.load(f)

# Pinecone 초기화
pinecone.init(
    api_key="YOUR_PINECONE_API_KEY",
    environment="gcp-starter"
)

index_name = "growth-clinic-kb"
if index_name not in pinecone.list_indexes():
    pinecone.create_index(
        name=index_name,
        dimension=1536,  # text-embedding-3-small 차원
        metric="cosine"
    )

index = pinecone.Index(index_name)

# FAQ 임베딩 및 업로드
vectors = []
for i, faq in enumerate(faqs):
    # 질문 + 답변 합쳐서 임베딩
    text = f"질문: {faq['question']}\n답변: {faq['answer']}"
    embedding = create_embedding(text)
    
    vectors.append({
        "id": f"faq_{i}",
        "values": embedding,
        "metadata": {
            "question": faq["question"],
            "answer": faq["answer"],
            "category": faq["category"],
            "type": "faq"
        }
    })
    
    # 배치로 업로드 (100개씩)
    if len(vectors) == 100:
        index.upsert(vectors=vectors)
        vectors = []
        print(f"업로드 완료: {i+1}개")

# 남은 데이터 업로드
if vectors:
    index.upsert(vectors=vectors)

print("✅ 임베딩 완료!")
```

### 2. 검색 함수 (Python/JavaScript)

```python
def search_knowledge(query, top_k=5):
    """사용자 질문과 관련된 문서 검색"""
    # 질문 임베딩
    query_embedding = create_embedding(query)
    
    # Pinecone 검색
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True
    )
    
    # 관련 문서 추출
    contexts = []
    for match in results['matches']:
        contexts.append({
            "question": match['metadata']['question'],
            "answer": match['metadata']['answer'],
            "score": match['score']
        })
    
    return contexts
```

### 3. Cloudflare Worker (RAG + Gemini)

```javascript
// Cloudflare Worker
const GEMINI_API_KEY = env.GEMINI_API_KEY;
const PINECONE_API_KEY = env.PINECONE_API_KEY;
const OPENAI_API_KEY = env.OPENAI_API_KEY;

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { message } = await request.json();

    try {
      // 1. 사용자 질문 임베딩
      const embeddingResponse = await fetch(
        'https://api.openai.com/v1/embeddings',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: message
          })
        }
      );
      const embeddingData = await embeddingResponse.json();
      const queryVector = embeddingData.data[0].embedding;

      // 2. Pinecone에서 관련 문서 검색
      const searchResponse = await fetch(
        `https://YOUR_INDEX.svc.gcp-starter.pinecone.io/query`,
        {
          method: 'POST',
          headers: {
            'Api-Key': PINECONE_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vector: queryVector,
            topK: 5,
            includeMetadata: true
          })
        }
      );
      const searchData = await searchResponse.json();

      // 3. 검색된 문서를 컨텍스트로 구성
      const contexts = searchData.matches.map(match => 
        `질문: ${match.metadata.question}\n답변: ${match.metadata.answer}`
      ).join('\n\n---\n\n');

      // 4. Gemini에 프롬프트 전달
      const systemPrompt = `당신은 연세새봄의원 187 성장 클리닉의 전문 상담사입니다.

다음은 관련 참고 자료입니다:

${contexts}

위 자료를 바탕으로 사용자 질문에 답변하세요.
- 정확하고 전문적으로
- 한국어로
- 200자 이내로 간결하게
- 필요시 병원 방문 권유`;

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemPrompt}\n\n사용자 질문: ${message}`
              }]
            }],
            generationConfig: {
              maxOutputTokens: 500,
              temperature: 0.3  // 낮추면 더 정확, 높이면 더 창의적
            }
          })
        }
      );

      const geminiData = await geminiResponse.json();
      const answer = geminiData.candidates[0].content.parts[0].text;

      // 5. 응답 반환 (출처 포함)
      return new Response(JSON.stringify({
        answer: answer,
        sources: searchData.matches.map(m => ({
          question: m.metadata.question,
          score: m.score
        }))
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: error.message 
      }), { status: 500 });
    }
  }
};
```

---

## 🔧 구현 방법 2: OpenAI Fine-tuning (대안)

### 장점:
- 더 정확한 응답
- 일관된 톤앤매너
- 출력 형식 제어

### 단점:
- 비용 높음 (학습 + 사용)
- 데이터 업데이트 어려움
- 환각(Hallucination) 가능

### 코드:
```python
import openai

openai.api_key = "YOUR_OPENAI_API_KEY"

# Fine-tuning 작업 생성
response = openai.fine_tuning.jobs.create(
    training_file="file-abc123",  # 업로드한 파일 ID
    model="gpt-3.5-turbo",
    hyperparameters={
        "n_epochs": 3
    }
)

# 작업 ID 확인
job_id = response.id
print(f"Fine-tuning 시작: {job_id}")

# 완료 후 사용
completion = openai.chat.completions.create(
    model="ft:gpt-3.5-turbo:YOUR_MODEL_ID",
    messages=[
        {"role": "system", "content": "당신은 성장 클리닉 상담사입니다."},
        {"role": "user", "content": "우리 아이 키가 작아요"}
    ]
)
```

---

## 💰 비용 비교

### RAG 방식 (권장):
- **임베딩**: $0.02 / 1M tokens (초기 1회)
- **Gemini**: 무료 (월 45K 요청)
- **Pinecone**: 무료 (100K 벡터)
- **총 월 비용**: ~$0 (무료 범위 내)

### Fine-tuning 방식:
- **학습**: $8 / 1M tokens
- **사용**: $12 / 1M tokens (GPT-3.5)
- **총 월 비용**: ~$50-200

---

## 🚀 다음 단계

1. ✅ 데이터 준비 완료
2. ➡️ **지금**: RAG 시스템 구축
3. 🔜 웹앱 연동
4. 🔜 테스트 및 개선

---

## 📚 참고 자료

- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Pinecone 시작하기](https://docs.pinecone.io/docs/quickstart)
- [Gemini API](https://ai.google.dev/docs)
- [RAG 튜토리얼](https://python.langchain.com/docs/use_cases/question_answering/)
