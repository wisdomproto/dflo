"""
PDF → RAG 시스템 (100% 무료 버전)
- Google Gemini로 임베딩 + 답변 생성
- 로컬 벡터 DB (Chroma) 사용
- OpenAI/Pinecone 불필요!
"""

import os
import json
import PyPDF2
import re
from pathlib import Path
from typing import List, Dict
import google.generativeai as genai
import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# Gemini API 설정
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
genai.configure(api_key=GEMINI_API_KEY)

class PDFtoRAGFree:
    def __init__(self, pdf_path: str, collection_name: str = "growth_bible"):
        self.pdf_path = pdf_path
        self.collection_name = collection_name
        self.chunks = []
        
        # Chroma DB 초기화 (로컬 저장)
        self.chroma_client = chromadb.PersistentClient(path="./chroma_db")
        
        # Gemini 임베딩 함수
        self.embedding_function = embedding_functions.GoogleGenerativeAiEmbeddingFunction(
            api_key=GEMINI_API_KEY
        )
        
        # 컬렉션 생성 또는 가져오기
        try:
            self.collection = self.chroma_client.get_collection(
                name=collection_name,
                embedding_function=self.embedding_function
            )
            print(f"✅ 기존 컬렉션 로드: {collection_name}")
        except:
            self.collection = self.chroma_client.create_collection(
                name=collection_name,
                embedding_function=self.embedding_function,
                metadata={"description": "성장 바이블 RAG 시스템"}
            )
            print(f"✅ 새 컬렉션 생성: {collection_name}")
    
    def extract_text_from_pdf(self) -> str:
        """PDF에서 텍스트 추출"""
        print(f"\n📄 PDF 파일 읽는 중: {self.pdf_path}")
        
        text = ""
        try:
            with open(self.pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                total_pages = len(pdf_reader.pages)
                
                for page_num, page in enumerate(pdf_reader.pages, 1):
                    page_text = page.extract_text()
                    text += f"\n\n[페이지 {page_num}]\n{page_text}"
                    
                    if page_num % 10 == 0:
                        print(f"   진행률: {page_num}/{total_pages} 페이지")
            
            print(f"✅ 텍스트 추출 완료: 총 {len(text):,}자")
            return text
        except Exception as e:
            print(f"❌ PDF 읽기 오류: {e}")
            raise
    
    def clean_text(self, text: str) -> str:
        """텍스트 정리"""
        # 과도한 줄바꿈 제거
        text = re.sub(r'\n{3,}', '\n\n', text)
        # 공백 정리
        text = re.sub(r' +', ' ', text)
        return text.strip()
    
    def split_into_chunks(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[Dict]:
        """텍스트를 청크로 분할"""
        print(f"\n📋 텍스트 청크 분할 중 (크기: {chunk_size}, 오버랩: {overlap})")
        
        # 페이지별로 먼저 분할
        pages = text.split('[페이지')
        chunks = []
        
        for page_text in pages:
            if not page_text.strip():
                continue
            
            # 페이지 번호 추출
            page_match = re.match(r'(\d+)\]', page_text)
            page_num = int(page_match.group(1)) if page_match else 0
            
            # 섹션별로 분할
            sections = re.split(r'(##\s+[^\n]+)', page_text)
            
            current_section_title = "도입부"
            current_text = ""
            
            for section in sections:
                if section.startswith('##'):
                    # 이전 섹션 저장
                    if current_text.strip():
                        self._create_chunks_from_text(
                            current_text, 
                            current_section_title, 
                            page_num, 
                            chunks, 
                            chunk_size, 
                            overlap
                        )
                    
                    # 새 섹션 시작
                    current_section_title = section.strip()
                    current_text = ""
                else:
                    current_text += section
            
            # 마지막 섹션 저장
            if current_text.strip():
                self._create_chunks_from_text(
                    current_text, 
                    current_section_title, 
                    page_num, 
                    chunks, 
                    chunk_size, 
                    overlap
                )
        
        print(f"✅ 총 {len(chunks)}개 청크 생성 완료")
        self.chunks = chunks
        return chunks
    
    def _create_chunks_from_text(self, text: str, title: str, page_num: int, 
                                   chunks: List[Dict], chunk_size: int, overlap: int):
        """텍스트를 청크로 분할하여 리스트에 추가"""
        text = self.clean_text(text)
        
        # 문장 단위로 분할
        sentences = re.split(r'([.!?]\s+)', text)
        
        current_chunk = ""
        chunk_count = 0
        
        for i in range(0, len(sentences), 2):
            sentence = sentences[i] + (sentences[i+1] if i+1 < len(sentences) else '')
            
            if len(current_chunk) + len(sentence) > chunk_size:
                if current_chunk:
                    chunks.append({
                        'id': f'chunk_{len(chunks):05d}',
                        'text': current_chunk.strip(),
                        'metadata': {
                            'title': title,
                            'page': str(page_num),
                            'chunk_index': str(chunk_count),
                            'source': 'growth_bible_pdf'
                        }
                    })
                    chunk_count += 1
                    current_chunk = current_chunk[-overlap:] if len(current_chunk) > overlap else ""
            
            current_chunk += sentence
        
        # 마지막 청크 저장
        if current_chunk.strip():
            chunks.append({
                'id': f'chunk_{len(chunks):05d}',
                'text': current_chunk.strip(),
                'metadata': {
                    'title': title,
                    'page': str(page_num),
                    'chunk_index': str(chunk_count),
                    'source': 'growth_bible_pdf'
                }
            })
    
    def upload_to_chroma(self):
        """Chroma DB에 청크 업로드"""
        print(f"\n🔄 Chroma DB에 업로드 중...")
        
        # 기존 데이터 확인
        existing_count = self.collection.count()
        if existing_count > 0:
            print(f"⚠️  기존 데이터 {existing_count}개 발견. 삭제 후 재업로드합니다.")
            # 컬렉션 삭제 후 재생성
            self.chroma_client.delete_collection(self.collection_name)
            self.collection = self.chroma_client.create_collection(
                name=self.collection_name,
                embedding_function=self.embedding_function,
                metadata={"description": "성장 바이블 RAG 시스템"}
            )
        
        # 배치로 업로드
        batch_size = 100
        total_chunks = len(self.chunks)
        
        for i in range(0, total_chunks, batch_size):
            batch = self.chunks[i:i+batch_size]
            
            ids = [chunk['id'] for chunk in batch]
            documents = [chunk['text'] for chunk in batch]
            metadatas = [chunk['metadata'] for chunk in batch]
            
            try:
                self.collection.add(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas
                )
                print(f"   업로드 진행: {min(i+batch_size, total_chunks)}/{total_chunks} ({min(i+batch_size, total_chunks)/total_chunks*100:.1f}%)")
            except Exception as e:
                print(f"⚠️  배치 {i//batch_size + 1} 업로드 오류: {e}")
                continue
        
        print(f"✅ 업로드 완료! 총 {self.collection.count()}개 문서")
    
    def search(self, query: str, top_k: int = 5) -> List[Dict]:
        """쿼리로 관련 문서 검색"""
        results = self.collection.query(
            query_texts=[query],
            n_results=top_k,
            include=['documents', 'metadatas', 'distances']
        )
        
        # 결과 포맷팅
        docs = []
        for i in range(len(results['ids'][0])):
            docs.append({
                'id': results['ids'][0][i],
                'text': results['documents'][0][i],
                'metadata': results['metadatas'][0][i],
                'distance': results['distances'][0][i],
                'score': 1 - results['distances'][0][i]  # 유사도로 변환
            })
        
        return docs
    
    def run(self):
        """전체 프로세스 실행"""
        print("=" * 60)
        print("🚀 PDF → RAG 자동 구축 시작! (100% 무료)")
        print("=" * 60)
        
        # 1. PDF 텍스트 추출
        text = self.extract_text_from_pdf()
        
        # 2. 청크 분할
        chunks = self.split_into_chunks(text, chunk_size=1000, overlap=200)
        
        # 3. Chroma DB 업로드
        self.upload_to_chroma()
        
        print("\n" + "=" * 60)
        print("✅ 모든 작업 완료!")
        print("=" * 60)
        print(f"\n📊 최종 통계:")
        print(f"   - 총 청크 수: {len(self.chunks):,}")
        print(f"   - Chroma DB 저장 위치: ./chroma_db/")
        print(f"   - 컬렉션 이름: {self.collection_name}")
        print(f"\n💰 비용: $0 (완전 무료!)")
        print(f"\n🎉 이제 AI 챗봇에서 사용할 수 있습니다!")


def test_search(collection_name: str = "growth_bible"):
    """검색 테스트"""
    print("\n" + "=" * 60)
    print("🧪 검색 테스트")
    print("=" * 60)
    
    # Chroma 클라이언트 초기화
    chroma_client = chromadb.PersistentClient(path="./chroma_db")
    embedding_function = embedding_functions.GoogleGenerativeAiEmbeddingFunction(
        api_key=GEMINI_API_KEY
    )
    
    collection = chroma_client.get_collection(
        name=collection_name,
        embedding_function=embedding_function
    )
    
    # 테스트 질문
    test_queries = [
        "아이가 밥을 안 먹는데 어떻게 해야 하나요?",
        "성장호르몬 주사는 언제부터 맞아야 하나요?",
        "키가 작은 아이를 위한 운동은 뭐가 좋나요?"
    ]
    
    for query in test_queries:
        print(f"\n❓ 질문: {query}")
        print("-" * 60)
        
        results = collection.query(
            query_texts=[query],
            n_results=3
        )
        
        for i in range(len(results['ids'][0])):
            meta = results['metadatas'][0][i]
            doc = results['documents'][0][i]
            dist = results['distances'][0][i]
            score = 1 - dist
            
            print(f"\n📄 결과 {i+1} (유사도: {score:.2%})")
            print(f"   제목: {meta.get('title', 'N/A')}")
            print(f"   페이지: {meta.get('page', 'N/A')}")
            print(f"   내용: {doc[:200]}...")


if __name__ == "__main__":
    import sys
    
    # 명령줄 인수로 PDF 경로와 컬렉션 이름 받기
    if len(sys.argv) >= 2:
        pdf_path = sys.argv[1]
        collection_name = sys.argv[2] if len(sys.argv) >= 3 else "growth_bible"
    else:
        pdf_path = "우리 아이 키 성장 바이블 원고.pdf"
        collection_name = "growth_bible"
    
    print(f"📄 PDF 파일: {pdf_path}")
    print(f"📦 컬렉션: {collection_name}")
    print("")
    
    if not os.path.exists(pdf_path):
        print(f"❌ PDF 파일을 찾을 수 없습니다: {pdf_path}")
        print(f"   현재 디렉토리: {os.getcwd()}")
        print("")
        print("사용법:")
        print(f"  python {sys.argv[0]} <PDF경로> [컬렉션명]")
        print("")
        print("예시:")
        print(f"  python {sys.argv[0]} ../우리아이키성장바이블원고.pdf growth_bible")
        sys.exit(1)
    
    # RAG 시스템 구축
    rag_builder = PDFtoRAGFree(pdf_path, collection_name=collection_name)
    rag_builder.run()
    
    # 자동 검색 테스트 (Enter 대기 제거)
    print("\n🧪 간단한 검색 테스트 실행 중...")
    try:
        test_search(collection_name)
    except Exception as e:
        print(f"⚠️  테스트 실패 (무시 가능): {e}")
    
    print("\n" + "=" * 60)
    print("✅ 설정 완료! 다음 단계:")
    print("1. 로컬 API 서버 실행: uvicorn local_api_server:app --port 5000")
    print("2. 웹앱 실행 (새 터미널): python -m http.server 8000")
    print("3. 브라우저: http://localhost:8000/info.html")
    print("=" * 60)
