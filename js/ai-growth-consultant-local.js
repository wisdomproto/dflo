// AI 상담 챗봇 클라이언트 (로컬 API 버전)
// 로컬 서버 연결 - 완전 무료!

class AIGrowthConsultantLocal {
    constructor(apiUrl = 'http://127.0.0.1:5000') {
        this.apiUrl = apiUrl;
        console.log('✅ AI 상담 클라이언트 초기화 - API 서버:', this.apiUrl);
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
            const response = await fetch(`${this.apiUrl}/api/chat`, {
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
                if (response.status === 500) {
                    throw new Error('서버 오류가 발생했습니다. 로컬 API 서버가 실행 중인지 확인하세요.');
                }
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
                timestamp: new Date().toISOString()
            });

            return {
                answer: data.answer,
                sources: data.sources || [],
                conversationId: data.conversation_id,
                cost: 0  // 완전 무료!
            };

        } catch (error) {
            console.error('AI 상담 오류:', error);
            
            // 서버 연결 오류 특별 처리
            if (error.message.includes('Failed to fetch')) {
                throw new Error('❌ 로컬 API 서버에 연결할 수 없습니다.\n\n다음을 확인하세요:\n1. python scripts/local_api_server.py 실행 여부\n2. 서버 URL: http://localhost:8080');
            }
            
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    async checkServerStatus() {
        try {
            const response = await fetch(`${this.apiUrl}/`);
            const data = await response.json();
            return {
                isRunning: response.ok,
                info: data
            };
        } catch (error) {
            return {
                isRunning: false,
                error: error.message
            };
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
async function initAIConsultantLocal() {
    const apiUrl = 'http://localhost:8080';
    aiConsultant = new AIGrowthConsultantLocal(apiUrl);

    // 서버 상태 확인
    const status = await aiConsultant.checkServerStatus();
    
    if (!status.isRunning) {
        showServerError();
        return;
    }

    console.log('✅ 로컬 API 서버 연결 완료:', status.info);
    showServerSuccess(status.info);

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
                            <p>안녕하세요! 연세새봄의원 187 성장 클리닉 AI 상담사입니다.<br>'우리 아이 키 성장 바이블' 책을 기반으로 상담해드립니다! 😊</p>
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

    console.log('✅ AI 상담 챗봇 초기화 완료 (로컬 서버)');
}

function showServerError() {
    const container = document.getElementById('aiChatMessages');
    container.innerHTML = `
        <div class="ai-message error">
            <div class="ai-avatar">⚠️</div>
            <div class="ai-content">
                <strong>로컬 API 서버 연결 실패</strong>
                <p style="margin-top: 12px;">다음 단계를 따라주세요:</p>
                <ol style="margin-left: 20px; margin-top: 8px; line-height: 1.8;">
                    <li>터미널에서 실행: <code>python scripts/local_api_server.py</code></li>
                    <li>서버 시작 메시지 확인</li>
                    <li>페이지 새로고침</li>
                </ol>
                <p style="margin-top: 12px; color: var(--text-light); font-size: 0.875rem;">
                    서버 URL: http://localhost:8080
                </p>
            </div>
        </div>
    `;
}

function showServerSuccess(info) {
    const existingMessage = document.querySelector('.server-status');
    if (!existingMessage) {
        const container = document.getElementById('aiChatMessages');
        const statusDiv = document.createElement('div');
        statusDiv.className = 'ai-message server-status';
        statusDiv.innerHTML = `
            <div class="ai-avatar">✅</div>
            <div class="ai-content" style="background: #d1fae5; border-color: #6ee7b7;">
                <strong style="color: #065f46;">로컬 서버 연결 완료!</strong>
                <p style="margin-top: 8px; font-size: 0.875rem; color: #047857;">
                    • 데이터베이스: ${info.database || 'Chroma DB'}<br>
                    • AI 모델: ${info.model || 'Gemini Pro'}<br>
                    • 비용: <strong>${info.cost || '무료!'}</strong>
                </p>
            </div>
        `;
        container.insertBefore(statusDiv, container.firstChild);
    }
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

// 나머지 UI 함수들은 ai-growth-consultant.js와 동일
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
                <strong>📚 참고 자료 (책):</strong>
                ${sources.map((src, i) => `
                    <div class="source-item">
                        ${i + 1}. ${escapeHtml(src.title)} (페이지 ${src.page})
                        <span class="source-score">(유사도 ${src.similarity})</span>
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
            <div class="message-time">${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} • 💰 무료</div>
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
            <p style="white-space: pre-line;">${escapeHtml(error)}</p>
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
    return escapeHtml(text).replace(/\n/g, '<br>');
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('aiChatMessages')) {
        initAIConsultantLocal();
    }
});
