"""
PDF 기반 자동 RAG 시스템 구축 스크립트
- PDF 파일에서 텍스트 추출
- 자동 청크 분할 (의미 단위)
- 임베딩 생성 및 Pinecone 업로드
"""

import os
import json
import openai
import pinecone
from pathlib import Path
from typing import List, Dict
import PyPDF2
import re
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# API 키 설정
openai.api_key = os.getenv('OPENAI_API_KEY')
pinecone.init(
    api_key=os.getenv('PINECONE_API_KEY'),
    environment='gcp-starter'
)

class PDFtoRAG:
    def __init__(self, pdf_path: str, index_name: str = "growth-clinic-kb"):
        self.pdf_path = pdf_path
        self.index_name = index_name
        self.chunks = []
        
    def extract_text_from_pdf(self) -> str:
        """PDF에서 텍스트 추출"""
        print(f"📄 PDF 파일 읽는 중: {self.pdf_path}")
        
        text = ""
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
    
    def clean_text(self, text: str) -> str:
        """텍스트 정리"""
        # 과도한 줄바꿈 제거
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # 특수문자 정리 (한글, 영문, 숫자, 기본 문장부호만)
        # text = re.sub(r'[^\w\s가-힣.,!?·\-\(\)\[\]]', '', text)
        
        # 공백 정리
        text = re.sub(r' +', ' ', text)
        
        return text.strip()
    
    def split_into_chunks(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[Dict]:
        """텍스트를 청크로 분할 (오버랩 포함)"""
        print(f"\n📋 텍스트 청크 분할 중 (크기: {chunk_size}, 오버랩: {overlap})")
        
        # 페이지별로 먼저 분할
        pages = text.split('[페이지')
        chunks = []
        chunk_id = 0
        
        for page_text in pages:
            if not page_text.strip():
                continue
            
            # 페이지 번호 추출
            page_match = re.match(r'(\d+)\]', page_text)
            page_num = int(page_match.group(1)) if page_match else 0
            
            # 섹션별로 분할 (## 제목 기준)
            sections = re.split(r'(##\s+[^\n]+)', page_text)
            
            current_section_title = "도입부"
            current_text = ""
            
            for i, section in enumerate(sections):
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
                            'page': page_num,
                            'chunk_index': chunk_count,
                            'source': 'growth_bible_pdf',
                            'type': 'book_content'
                        }
                    })
                    chunk_count += 1
                    
                    # 오버랩 처리: 마지막 문장 일부 유지
                    current_chunk = current_chunk[-overlap:] if len(current_chunk) > overlap else ""
            
            current_chunk += sentence
        
        # 마지막 청크 저장
        if current_chunk.strip():
            chunks.append({
                'id': f'chunk_{len(chunks):05d}',
                'text': current_chunk.strip(),
                'metadata': {
                    'title': title,
                    'page': page_num,
                    'chunk_index': chunk_count,
                    'source': 'growth_bible_pdf',
                    'type': 'book_content'
                }
            })
    
    def create_embeddings_and_upload(self, batch_size: int = 100):
        """임베딩 생성 및 Pinecone 업로드"""
        print(f"\n🔄 임베딩 생성 및 업로드 중...")
        
        # Pinecone 인덱스 연결
        if self.index_name not in pinecone.list_indexes():
            print(f"⚠️  인덱스 '{self.index_name}'가 없습니다. 생성 중...")
            pinecone.create_index(
                name=self.index_name,
                dimension=1536,
                metric='cosine'
            )
            print(f"✅ 인덱스 생성 완료")
        
        index = pinecone.Index(self.index_name)
        
        # 배치로 처리
        total_chunks = len(self.chunks)
        vectors = []
        
        for i, chunk in enumerate(self.chunks):
            # 임베딩 생성
            try:
                response = openai.embeddings.create(
                    model="text-embedding-3-small",
                    input=chunk['text']
                )
                embedding = response.data[0].embedding
                
                # 벡터 준비
                vectors.append({
                    'id': chunk['id'],
                    'values': embedding,
                    'metadata': {
                        **chunk['metadata'],
                        'text_preview': chunk['text'][:200] + '...' if len(chunk['text']) > 200 else chunk['text']
                    }
                })
                
                # 배치 업로드
                if len(vectors) >= batch_size or i == total_chunks - 1:
                    index.upsert(vectors=vectors)
                    print(f"   업로드 진행: {i+1}/{total_chunks} ({(i+1)/total_chunks*100:.1f}%)")
                    vectors = []
                
            except Exception as e:
                print(f"⚠️  청크 {chunk['id']} 처리 중 오류: {e}")
                continue
        
        print(f"✅ 임베딩 및 업로드 완료!")
        
        # 통계 확인
        stats = index.describe_index_stats()
        print(f"\n📊 Pinecone 통계:")
        print(f"   - 총 벡터 수: {stats['total_vector_count']:,}")
        print(f"   - 인덱스 차원: {stats['dimension']}")
    
    def save_chunks_to_json(self, output_path: str = "data/processed/chunks.json"):
        """청크를 JSON 파일로 저장 (백업용)"""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.chunks, f, ensure_ascii=False, indent=2)
        
        print(f"💾 청크 백업 완료: {output_path}")
    
    def run(self):
        """전체 프로세스 실행"""
        print("=" * 60)
        print("🚀 PDF → RAG 자동 구축 시작!")
        print("=" * 60)
        
        # 1. PDF 텍스트 추출
        text = self.extract_text_from_pdf()
        
        # 2. 청크 분할
        chunks = self.split_into_chunks(text, chunk_size=1000, overlap=200)
        
        # 3. JSON 백업
        self.save_chunks_to_json()
        
        # 4. 임베딩 및 업로드
        self.create_embeddings_and_upload()
        
        print("\n" + "=" * 60)
        print("✅ 모든 작업 완료!")
        print("=" * 60)
        print(f"\n📊 최종 통계:")
        print(f"   - 총 청크 수: {len(self.chunks):,}")
        print(f"   - 평균 청크 크기: {sum(len(c['text']) for c in self.chunks) / len(self.chunks):.0f}자")
        print(f"   - Pinecone 인덱스: {self.index_name}")
        print(f"\n🎉 이제 AI 챗봇에서 사용할 수 있습니다!")


if __name__ == "__main__":
    # PDF 파일 경로
    pdf_path = "우리 아이 키 성장 바이블 원고.pdf"
    
    # RAG 시스템 구축
    rag_builder = PDFtoRAG(pdf_path, index_name="growth-clinic-kb")
    rag_builder.run()
    
    print("\n" + "=" * 60)
    print("다음 단계:")
    print("1. Cloudflare Worker 배포 (cloudflare-worker-rag.js)")
    print("2. 웹앱에 AI 챗봇 UI 추가 (js/ai-growth-consultant.js)")
    print("3. 테스트: '아이가 밥을 안 먹는데 어떻게 해야 하나요?'")
    print("=" * 60)
