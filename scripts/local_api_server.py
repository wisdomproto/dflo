"""
로컬 API 서버 (100% 무료)
- Chroma DB에서 검색
- Gemini로 답변 생성
- FastAPI로 REST API 제공
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
from chromadb.utils import embedding_functions
import google.generativeai as genai
import os
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# Gemini API 설정
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
genai.configure(api_key=GEMINI_API_KEY)

# FastAPI 앱 생성
app = FastAPI(title="성장 상담 AI API", version="1.0.0")

# CORS 설정 (웹앱에서 접근 가능하도록)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 도메인 허용 (프로덕션에서는 제한 필요)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Chroma DB 초기화
chroma_client = chromadb.PersistentClient(path="./chroma_db")
embedding_function = embedding_functions.GoogleGenerativeAiEmbeddingFunction(
    api_key=GEMINI_API_KEY
)

try:
    collection = chroma_client.get_collection(
        name="growth_bible",
        embedding_function=embedding_function
    )
    print("✅ Chroma DB 컬렉션 로드 완료")
except Exception as e:
    print(f"❌ Chroma DB 로드 실패: {e}")
    print("   먼저 pdf_to_rag_free.py를 실행하세요!")
    collection = None

# Gemini 모델 초기화
model = genai.GenerativeModel('gemini-pro')

# 시스템 프롬프트
SYSTEM_PROMPT = """당신은 연세새봄의원 187 성장 클리닉의 전문 AI 상담사입니다.

## 역할 및 전문 분야
- 아이 성장 발달 상담
- 성장호르몬 치료 안내
- 성조숙증 조기 발견 및 대응
- 영양/운동/수면 관리 조언

## 상담 원칙
1. **정확성**: 책의 내용을 바탕으로 정확하게 답변
2. **친절함**: 부모님의 걱정을 이해하고 공감
3. **간결함**: 핵심만 명확하게 전달
4. **안전성**: 확실하지 않으면 병원 방문 권유
5. **책임**: "AI 상담은 참고용이며 전문의 진단 필요" 명시

## 참고 자료
다음은 '우리 아이 키 성장 바이블' 책에서 발췌한 내용입니다:

{context}

## 병원 정보
- 연세새봄의원 187 성장 클리닉
- 전화: 02-1234-5678
- 진료시간: 평일 09:00-18:00, 토요일 09:00-13:00

## 응답 형식
1. 질문에 대한 명확한 답변 (책 내용 기반)
2. 필요시 추가 정보
3. 중요한 경우 "전문의 상담 권장" 문구

위 참고 자료를 바탕으로 사용자 질문에 답변하세요."""

# 요청/응답 모델
class ChatRequest(BaseModel):
    message: str
    conversation_id: str = None

class ChatResponse(BaseModel):
    success: bool
    answer: str
    sources: list = []
    conversation_id: str = None
    metadata: dict = {}

@app.get("/")
async def root():
    """API 상태 확인"""
    return {
        "status": "running",
        "name": "성장 상담 AI API",
        "version": "1.0.0",
        "database": "Chroma DB (로컬)",
        "model": "Gemini Pro",
        "cost": "무료!"
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """채팅 엔드포인트"""
    
    if not collection:
        raise HTTPException(
            status_code=500, 
            detail="Chroma DB가 초기화되지 않았습니다. pdf_to_rag_free.py를 먼저 실행하세요."
        )
    
    try:
        print(f"\n📩 질문: {request.message}")
        
        # 1. Chroma DB에서 관련 문서 검색
        results = collection.query(
            query_texts=[request.message],
            n_results=5,
            include=['documents', 'metadatas', 'distances']
        )
        
        # 2. 컨텍스트 구성
        contexts = []
        sources = []
        
        for i in range(len(results['ids'][0])):
            doc = results['documents'][0][i]
            meta = results['metadatas'][0][i]
            dist = results['distances'][0][i]
            score = 1 - dist
            
            # 유사도 70% 이상만
            if score >= 0.7:
                contexts.append(f"[{meta.get('title', '제목 없음')}, 페이지 {meta.get('page', '?')}]\n{doc}")
                sources.append({
                    'title': meta.get('title', '제목 없음'),
                    'page': meta.get('page', '?'),
                    'similarity': f"{score:.0%}"
                })
        
        if not contexts:
            contexts.append("관련 내용을 찾지 못했습니다.")
        
        context_text = "\n\n---\n\n".join(contexts[:3])  # 상위 3개만
        
        print(f"✅ 관련 문서 {len(sources)}개 발견")
        
        # 3. Gemini로 답변 생성
        prompt = SYSTEM_PROMPT.format(context=context_text) + f"\n\n사용자 질문: {request.message}"
        
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.3,
                max_output_tokens=800,
            )
        )
        
        answer = response.text
        print(f"✅ 답변 생성 완료 ({len(answer)}자)")
        
        # 4. 응답 반환
        return ChatResponse(
            success=True,
            answer=answer,
            sources=sources[:3],
            conversation_id=request.conversation_id or f"conv_{os.urandom(4).hex()}",
            metadata={
                "model": "gemini-pro",
                "source_count": len(sources),
                "cost": 0
            }
        )
        
    except Exception as e:
        print(f"❌ 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
async def stats():
    """데이터베이스 통계"""
    if not collection:
        return {"error": "Chroma DB가 초기화되지 않았습니다."}
    
    count = collection.count()
    return {
        "total_documents": count,
        "collection_name": "growth_bible",
        "database": "Chroma DB (로컬)",
        "storage_path": "./chroma_db/"
    }

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("🚀 로컬 API 서버 시작!")
    print("=" * 60)
    print("\n📡 서버 정보:")
    print("   - URL: http://localhost:8080")
    print("   - API 문서: http://localhost:8080/docs")
    print("   - 데이터베이스: Chroma DB (로컬)")
    print("   - AI 모델: Google Gemini Pro")
    print("   - 비용: 무료!")
    print("\n💡 테스트:")
    print('   curl -X POST http://localhost:8080/api/chat \\')
    print('        -H "Content-Type: application/json" \\')
    print('        -d \'{"message": "아이가 밥을 안 먹어요"}\'')
    print("\n" + "=" * 60 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8080)
