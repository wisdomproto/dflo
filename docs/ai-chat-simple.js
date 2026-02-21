// 제한적 API 키 노출 방식 (비권장)
// js/ai-chat-simple.js

// ⚠️ 주의: API 키가 클라이언트에 노출됩니다!
// Google Cloud Console에서 다음 제한 설정 필수:
// 1. HTTP 리퍼러 제한 (도메인 지정)
// 2. API 호출 할당량 제한
// 3. 사용량 알림 설정

const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

class SimpleAIChat {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async sendMessage(message) {
        try {
            const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: message
                        }]
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`API 오류: ${response.status}`);
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || '응답을 받지 못했습니다.';

        } catch (error) {
            console.error('AI 챗봇 오류:', error);
            throw error;
        }
    }
}

// 사용 예시
// const chatBot = new SimpleAIChat('YOUR_API_KEY_HERE');
// const response = await chatBot.sendMessage('안녕하세요!');
