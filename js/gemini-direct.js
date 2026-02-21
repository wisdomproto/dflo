// ⚠️ 주의: 테스트/데모용으로만 사용하세요!
// 프로덕션에서는 절대 사용하지 마세요!
// API 키가 노출되어 누구나 사용할 수 있습니다!

// Google AI Studio에서 "웹사이트 제한" 설정 필수:
// https://aistudio.google.com/app/apikey
// → API 키 설정 → HTTP 리퍼러 제한 추가
// → 허용 도메인: your-domain.com/*

class GeminiDirectClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    }

    async chat(message, systemPrompt = '') {
        const fullMessage = systemPrompt 
            ? `${systemPrompt}\n\n사용자: ${message}`
            : message;

        try {
            const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: fullMessage
                        }]
                    }],
                    generationConfig: {
                        maxOutputTokens: 500,
                        temperature: 0.7,
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'API 요청 실패');
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;

        } catch (error) {
            console.error('Gemini API 오류:', error);
            throw error;
        }
    }
}

// 사용 예시 (테스트용)
// const gemini = new GeminiDirectClient('YOUR_API_KEY');
// const response = await gemini.chat('안녕하세요!');
