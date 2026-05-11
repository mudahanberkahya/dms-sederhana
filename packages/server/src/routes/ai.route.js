import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const AI_MODEL = 'deepseek-chat';

function getApiKey() {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error("DEEPSEEK_API_KEY not configured");
    return key;
}

/**
 * POST /api/ai/chat — AI Chat (streaming SSE)
 * Body: { messages: [{role, content}], stream: true/false }
 */
router.post('/chat', requireAuth, async (req, res) => {
    try {
        const { messages, stream = true } = req.body;
        
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: "Messages array is required" });
        }

        const systemPrompt = {
            role: 'system',
            content: 'Kamu adalah asisten AI untuk DMS (Document Management System) hotel. ' +
                     'Kamu membantu user memahami dokumen, proses approval, workflow, ' +
                     'dan fitur-fitur DMS. Jawab dalam Bahasa Indonesia yang sopan dan profesional. ' +
                     'Jangan berikan saran medis, keuangan, atau hukum di luar konteks dokumen hotel.'
        };

        const allMessages = [systemPrompt, ...messages];

        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getApiKey()}`
            },
            body: JSON.stringify({
                model: AI_MODEL,
                messages: allMessages,
                stream: stream,
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("[AI Chat] DeepSeek API error:", response.status, errText);
            return res.status(response.status).json({ error: "AI service error", details: errText });
        }

        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6).trim();
                            if (data === '[DONE]') {
                                res.write('data: [DONE]\n\n');
                                continue;
                            }
                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices?.[0]?.delta?.content || '';
                                if (content) {
                                    res.write(`data: ${JSON.stringify({ content })}\n\n`);
                                }
                            } catch {
                                // Skip malformed chunks
                            }
                        }
                    }
                }
            } catch (streamErr) {
                console.error("[AI Chat] Stream error:", streamErr);
            }
            
            res.write('data: [DONE]\n\n');
            res.end();
        } else {
            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content || '';
            res.json({ reply, usage: data.usage });
        }
    } catch (err) {
        console.error("[AI Chat] Error:", err);
        res.status(500).json({ error: err.message || "AI chat failed" });
    }
});

/**
 * POST /api/ai/review — AI Review of document content
 */
router.post('/review', requireAuth, async (req, res) => {
    try {
        const { content, title } = req.body;
        
        if (!content) {
            return res.status(400).json({ error: "Document content is required" });
        }

        const messages = [
            { role: 'system', content: 'Kamu adalah reviewer dokumen hotel yang profesional. ' +
                'Review dokumen berikut dan berikan feedback dalam format JSON: ' +
                '{ "summary": "...", "issues": [{ "type": "error|warning|suggestion", "field": "...", "message": "..." }], ' +
                '"score": 0-100, "improvements": ["..."] }' +
                'Gunakan Bahasa Indonesia. Fokus pada kelengkapan, konsistensi, dan kepatuhan standar hotel.' },
            { role: 'user', content: `Judul Dokumen: ${title || "Tidak ada"}\n\nKonten:\n${content}` }
        ];

        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getApiKey()}`
            },
            body: JSON.stringify({
                model: AI_MODEL,
                messages,
                max_tokens: 4096,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`DeepSeek API error: ${response.status} ${errText}`);
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || '';
        
        try {
            const parsed = JSON.parse(reply);
            res.json({ review: parsed, usage: data.usage });
        } catch {
            res.json({ review: { summary: reply.substring(0, 500), issues: [] }, usage: data.usage });
        }
    } catch (err) {
        console.error("[AI Review] Error:", err);
        res.status(500).json({ error: err.message || "AI review failed" });
    }
});

/**
 * POST /api/ai/generate — Generate document draft from description
 */
router.post('/generate', requireAuth, async (req, res) => {
    try {
        const { description, template } = req.body;
        
        if (!description) {
            return res.status(400).json({ error: "Document description is required" });
        }

        const messages = [
            { role: 'system', content: 'Kamu adalah asisten pembuat draft dokumen hotel. ' +
                `Buat draft dokumen berdasarkan deskripsi berikut. Template: ${template || "surat formal hotel"}. ` +
                'Hasilkan dalam format teks dengan struktur yang rapi. Gunakan Bahasa Indonesia formal.' },
            { role: 'user', content: `Buatkan draft dokumen: ${description}` }
        ];

        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getApiKey()}`
            },
            body: JSON.stringify({
                model: AI_MODEL,
                messages,
                max_tokens: 4096
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`DeepSeek API error: ${response.status} ${errText}`);
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || '';
        res.json({ draft: reply, usage: data.usage });
    } catch (err) {
        console.error("[AI Generate] Error:", err);
        res.status(500).json({ error: err.message || "AI generation failed" });
    }
});

export default router;
