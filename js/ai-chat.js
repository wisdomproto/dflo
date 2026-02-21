// AI 상담 챗봇 (Gemini API 연동)
// js/ai-chat.js

class AIChatBot {
    constructor(proxyUrl) {
        this.proxyUrl = proxyUrl; // Cloudflare Worker URL
        this.chatHistory = [];
        this.isProcessing = false;
    }

    // 메시지 전송
    async sendMessage(userMessage, systemPrompt = '') {
        if (this.isProcessing) {
            throw new Error('이미 처리 중입니다. 잠시 후 다시 시도해주세요.');
        }

        this.isProcessing = true;

        try {
            // 시스템 프롬프트 + 사용자 메시지
            const fullMessage = systemPrompt 
                ? `${systemPrompt}\n\n사용자 질문: ${userMessage}`
                : userMessage;

            // 프록시 서버로 요청
            const response = await fetch(this.proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: fullMessage
                })
            });

            if (!response.ok) {
                throw new Error('API 요청 실패');
            }

            const data = await response.json();

            // Gemini 응답 파싱
            const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '응답을 받지 못했습니다.';

            // 대화 기록 저장
            this.chatHistory.push({
                role: 'user',
                content: userMessage,
                timestamp: new Date().toISOString()
            });
            this.chatHistory.push({
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date().toISOString()
            });

            return aiResponse;

        } catch (error) {
            console.error('AI 챗봇 오류:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    // 대화 기록 초기화
    clearHistory() {
        this.chatHistory = [];
    }

    // 대화 기록 가져오기
    getHistory() {
        return this.chatHistory;
    }
}

// 전역 인스턴스 생성
const aiChatBot = new AIChatBot('https://your-worker.workers.dev'); // Cloudflare Worker URL로 변경

// 성장 상담 전용 프롬프트
const GROWTH_CONSULTATION_PROMPT = `당신은 연세새봄의원 187 성장 클리닉의 전문 상담사입니다.

전문 분야:
- 아이 성장 발달
- 성장호르몬 치료
- 성조숙증 진단 및 치료
- 영양/운동/수면 관리
- 성장 예측 및 상담

상담 원칙:
1. 친절하고 전문적으로 답변
2. 의학적으로 정확한 정보 제공
3. 필요시 병원 방문 권유
4. 한국어로 답변
5. 200자 이내로 간결하게 답변

연세새봄의원 정보:
- 위치: 서울시 강남구
- 전화: 02-XXX-XXXX (실제 번호로 변경)
- 진료: 평일 09:00-18:00`;

// UI 함수들
function initAIChat() {
    const chatContainer = document.getElementById('aiChatContainer');
    const chatMessages = document.getElementById('aiChatMessages');
    const userInput = document.getElementById('aiUserInput');
    const sendButton = document.getElementById('aiSendButton');

    // 전송 버튼 클릭
    sendButton.addEventListener('click', () => handleSendMessage());

    // 엔터 키 전송
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
}

async function handleSendMessage() {
    const userInput = document.getElementById('aiUserInput');
    const message = userInput.value.trim();

    if (!message) return;

    // 사용자 메시지 표시
    addMessageToUI('user', message);
    userInput.value = '';

    // 로딩 표시
    const loadingId = addMessageToUI('assistant', '답변을 생성하고 있습니다...');

    try {
        // AI 응답 받기
        const response = await aiChatBot.sendMessage(message, GROWTH_CONSULTATION_PROMPT);

        // 로딩 메시지 제거하고 실제 응답 표시
        removeMessageFromUI(loadingId);
        addMessageToUI('assistant', response);

    } catch (error) {
        removeMessageFromUI(loadingId);
        addMessageToUI('assistant', '⚠️ 죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
}

function addMessageToUI(role, content) {
    const messagesContainer = document.getElementById('aiChatMessages');
    const messageId = 'msg-' + Date.now();

    const messageDiv = document.createElement('div');
    messageDiv.id = messageId;
    messageDiv.className = `chat-message ${role}`;
    messageDiv.innerHTML = `
        <div class="message-content">
            ${role === 'assistant' ? '🤖' : '👤'} ${content.replace(/\n/g, '<br>')}
        </div>
        <div class="message-time">${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return messageId;
}

function removeMessageFromUI(messageId) {
    const message = document.getElementById(messageId);
    if (message) {
        message.remove();
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('aiChatContainer')) {
        initAIChat();
    }
});
