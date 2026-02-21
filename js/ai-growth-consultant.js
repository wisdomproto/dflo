// AI 상담 챗봇 클라이언트 (RAG 시스템 연동)
// js/ai-growth-consultant.js

class AIGrowthConsultant {
    constructor(workerUrl) {
        this.workerUrl = workerUrl;
        this.conversationId = this.generateConversationId();
        this.chatHistory = [];
        this.isProcessing = false;
    }

    generateConversationId() {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async sendMessage(message) {
        if (this.isProcessing) {
            throw new Error('이미 처리 중입니다. 잠시만 기다려주세요.');
        }

        if (!message || message.trim().length === 0) {
            throw new Error('메시지를 입력해주세요.');
        }

        this.isProcessing = true;

        try {
            const response = await fetch(this.workerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message.trim(),
                    conversation_id: this.conversationId
                })
            });

            if (!response.ok) {
                throw new Error(`서버 오류: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || '알 수 없는 오류가 발생했습니다.');
            }

            // 대화 기록 저장
            this.chatHistory.push({
                role: 'user',
                content: message,
                timestamp: new Date().toISOString()
            });

            this.chatHistory.push({
                role: 'assistant',
                content: data.answer,
                sources: data.sources,
                timestamp: data.metadata.timestamp
            });

            return {
                answer: data.answer,
                sources: data.sources || [],
                conversationId: data.conversation_id
            };

        } catch (error) {
            console.error('AI 상담 오류:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    getHistory() {
        return this.chatHistory;
    }

    clearHistory() {
        this.chatHistory = [];
        this.conversationId = this.generateConversationId();
    }

    exportHistory() {
        const historyText = this.chatHistory.map(msg => {
            const role = msg.role === 'user' ? '👤 사용자' : '🤖 AI 상담사';
            const time = new Date(msg.timestamp).toLocaleString('ko-KR');
            return `[${time}] ${role}\n${msg.content}\n`;
        }).join('\n---\n\n');

        return historyText;
    }
}

// 전역 인스턴스
let aiConsultant = null;

// UI 초기화
function initAIConsultant() {
    const workerUrl = 'https://your-worker.YOUR_SUBDOMAIN.workers.dev'; // ⚠️ 실제 Worker URL로 변경!
    aiConsultant = new AIGrowthConsultant(workerUrl);

    const sendBtn = document.getElementById('aiSendBtn');
    const input = document.getElementById('aiInput');
    const clearBtn = document.getElementById('aiClearBtn');
    const exportBtn = document.getElementById('aiExportBtn');

    // 전송 버튼
    sendBtn.addEventListener('click', handleSendMessage);

    // 엔터키 전송
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // 대화 내역 지우기
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('대화 내역을 모두 지우시겠습니까?')) {
                aiConsultant.clearHistory();
                document.getElementById('aiChatMessages').innerHTML = `
                    <div class="ai-message">
                        <div class="ai-avatar">🤖</div>
                        <div class="ai-content">
                            <strong>AI 성장 상담사</strong>
                            <p>안녕하세요! 연세새봄의원 187 성장 클리닉 AI 상담사입니다.<br>아이의 성장에 관해 궁금한 점을 자유롭게 질문해주세요! 😊</p>
                        </div>
                    </div>
                `;
            }
        });
    }

    // 대화 내역 내보내기
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const history = aiConsultant.exportHistory();
            const blob = new Blob([history], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `상담내역_${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    console.log('✅ AI 상담 챗봇 초기화 완료');
}

async function handleSendMessage() {
    const input = document.getElementById('aiInput');
    const sendBtn = document.getElementById('aiSendBtn');
    const message = input.value.trim();

    if (!message) return;

    // UI 비활성화
    input.disabled = true;
    sendBtn.disabled = true;
    sendBtn.textContent = '전송 중...';

    // 사용자 메시지 표시
    addUserMessage(message);
    input.value = '';

    // 타이핑 애니메이션
    const typingId = showTypingIndicator();

    try {
        // AI 응답 받기
        const response = await aiConsultant.sendMessage(message);

        // 타이핑 제거
        removeTypingIndicator(typingId);

        // AI 응답 표시
        addAIMessage(response.answer, response.sources);

    } catch (error) {
        removeTypingIndicator(typingId);
        addErrorMessage(error.message);
    } finally {
        // UI 활성화
        input.disabled = false;
        sendBtn.disabled = false;
        sendBtn.textContent = '전송 ▶';
        input.focus();
    }
}

function addUserMessage(message) {
    const container = document.getElementById('aiChatMessages');
    const div = document.createElement('div');
    div.className = 'user-message';
    div.innerHTML = `
        <div class="user-content">
            <p>${escapeHtml(message)}</p>
            <div class="message-time">${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div class="user-avatar">👤</div>
    `;
    container.appendChild(div);
    scrollToBottom();
}

function addAIMessage(answer, sources = []) {
    const container = document.getElementById('aiChatMessages');
    const div = document.createElement('div');
    div.className = 'ai-message';
    
    let sourcesHtml = '';
    if (sources && sources.length > 0) {
        sourcesHtml = `
            <div class="ai-sources">
                <strong>📚 참고 자료:</strong>
                ${sources.map((src, i) => `
                    <div class="source-item">
                        ${i + 1}. ${escapeHtml(src.question)} 
                        <span class="source-score">(유사도 ${(src.similarity * 100).toFixed(0)}%)</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    div.innerHTML = `
        <div class="ai-avatar">🤖</div>
        <div class="ai-content">
            <strong>AI 성장 상담사</strong>
            <p>${formatAIMessage(answer)}</p>
            ${sourcesHtml}
            <div class="message-time">${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
    `;
    container.appendChild(div);
    scrollToBottom();
}

function showTypingIndicator() {
    const container = document.getElementById('aiChatMessages');
    const div = document.createElement('div');
    const id = 'typing_' + Date.now();
    div.id = id;
    div.className = 'ai-message typing';
    div.innerHTML = `
        <div class="ai-avatar">🤖</div>
        <div class="ai-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    container.appendChild(div);
    scrollToBottom();
    return id;
}

function removeTypingIndicator(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

function addErrorMessage(error) {
    const container = document.getElementById('aiChatMessages');
    const div = document.createElement('div');
    div.className = 'ai-message error';
    div.innerHTML = `
        <div class="ai-avatar">⚠️</div>
        <div class="ai-content">
            <strong>오류 발생</strong>
            <p>${escapeHtml(error)}</p>
            <p style="margin-top: 8px; font-size: 0.875rem; color: var(--text-light);">
                문제가 계속되면 <strong>02-1234-5678</strong>로 연락 주세요.
            </p>
        </div>
    `;
    container.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    const container = document.getElementById('aiChatMessages');
    container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatAIMessage(text) {
    // 줄바꿈 처리
    return escapeHtml(text).replace(/\n/g, '<br>');
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('aiChatMessages')) {
        initAIConsultant();
    }
});
