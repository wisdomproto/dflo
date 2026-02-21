// Cloudflare Worker - 성장 상담 AI RAG 시스템
// 환경 변수 필요: GEMINI_API_KEY, PINECONE_API_KEY, OPENAI_API_KEY, PINECONE_INDEX_HOST

export default {
  async fetch(request, env) {
    // CORS 설정
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // OPTIONS 요청 (CORS preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // POST만 허용
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    }

    try {
      const { message, conversation_id } = await request.json();

      console.log('📩 사용자 질문:', message);

      // ============================================
      // STEP 1: 사용자 질문 임베딩
      // ============================================
      console.log('🔍 임베딩 생성 중...');
      const embeddingResponse = await fetch(
        'https://api.openai.com/v1/embeddings',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: message,
            encoding_format: 'float'
          })
        }
      );

      if (!embeddingResponse.ok) {
        throw new Error('임베딩 생성 실패');
      }

      const embeddingData = await embeddingResponse.json();
      const queryVector = embeddingData.data[0].embedding;
      console.log('✅ 임베딩 생성 완료');

      // ============================================
      // STEP 2: Pinecone에서 관련 문서 검색
      // ============================================
      console.log('🔎 관련 문서 검색 중...');
      const searchResponse = await fetch(
        `https://${env.PINECONE_INDEX_HOST}/query`,
        {
          method: 'POST',
          headers: {
            'Api-Key': env.PINECONE_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vector: queryVector,
            topK: 5,
            includeMetadata: true,
            includeValues: false
          })
        }
      );

      if (!searchResponse.ok) {
        throw new Error('문서 검색 실패');
      }

      const searchData = await searchResponse.json();
      console.log(`✅ 관련 문서 ${searchData.matches.length}개 발견`);

      // ============================================
      // STEP 3: 컨텍스트 구성
      // ============================================
      const contexts = searchData.matches
        .filter(match => match.score > 0.7) // 유사도 70% 이상만
        .map(match => {
          const meta = match.metadata;
          return `[참고자료 ${match.score.toFixed(2)}]\n질문: ${meta.question}\n답변: ${meta.answer}`;
        })
        .join('\n\n---\n\n');

      console.log('📚 컨텍스트 구성 완료');

      // ============================================
      // STEP 4: 시스템 프롬프트 구성
      // ============================================
      const systemPrompt = `당신은 연세새봄의원 187 성장 클리닉의 전문 AI 상담사입니다.

## 역할 및 전문 분야
- 아이 성장 발달 상담
- 성장호르몬 치료 안내
- 성조숙증 조기 발견 및 대응
- 영양/운동/수면 관리 조언

## 상담 원칙
1. **정확성**: 의학적으로 정확한 정보만 제공
2. **친절함**: 부모님의 걱정을 이해하고 공감
3. **간결함**: 200자 이내로 핵심만 전달
4. **안전성**: 확실하지 않으면 병원 방문 권유
5. **책임**: "AI 상담은 참고용이며 전문의 진단 필요" 명시

## 참고 자료
다음은 우리 클리닉의 검증된 정보입니다:

${contexts}

## 병원 정보
- 연세새봄의원 187 성장 클리닉
- 전화: 02-1234-5678
- 진료시간: 평일 09:00-18:00, 토요일 09:00-13:00
- 온라인 예약: https://your-clinic.com/booking

## 응답 형식
1. 질문에 대한 명확한 답변
2. 필요시 추가 정보 (검사, 치료 등)
3. 중요한 경우 "전문의 상담 권장" 문구
4. 응급 상황 시 "즉시 병원 방문" 강조

---

위 참고 자료를 바탕으로 사용자 질문에 답변하세요.
참고 자료에 없는 내용은 일반적인 의학 지식으로 보완하되, "자세한 상담은 병원에서" 안내하세요.`;

      // ============================================
      // STEP 5: Gemini API 호출
      // ============================================
      console.log('🤖 AI 답변 생성 중...');
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{
                  text: `${systemPrompt}\n\n사용자 질문: ${message}`
                }]
              }
            ],
            generationConfig: {
              temperature: 0.3,       // 낮을수록 정확, 높을수록 창의적
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 800,   // 최대 토큰 수
              stopSequences: [],
            },
            safetySettings: [
              {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              },
              {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              }
            ]
          })
        }
      );

      if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json();
        throw new Error(`Gemini API 오류: ${JSON.stringify(errorData)}`);
      }

      const geminiData = await geminiResponse.json();
      
      // 안전 필터 체크
      if (!geminiData.candidates || geminiData.candidates.length === 0) {
        throw new Error('AI가 답변을 생성할 수 없습니다. 다시 시도해주세요.');
      }

      const answer = geminiData.candidates[0].content.parts[0].text;
      console.log('✅ AI 답변 생성 완료');

      // ============================================
      // STEP 6: 응답 반환
      // ============================================
      return new Response(JSON.stringify({
        success: true,
        answer: answer,
        conversation_id: conversation_id || `conv_${Date.now()}`,
        sources: searchData.matches.map(match => ({
          question: match.metadata.question,
          similarity: match.score.toFixed(2),
          category: match.metadata.category
        })).slice(0, 3),  // 상위 3개만
        metadata: {
          timestamp: new Date().toISOString(),
          model: 'gemini-pro',
          search_count: searchData.matches.length
        }
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      });

    } catch (error) {
      console.error('❌ 오류 발생:', error);
      
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        fallback_message: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 급한 경우 02-1234-5678로 연락 주세요.'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      });
    }
  }
};
