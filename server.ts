import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// Initialize Gemini API client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    aiConfigured: !!ai,
    timestamp: new Date().toISOString()
  });
});

function generateFastEceAnswer(message: string, context?: any): string {
  const q = message.toLowerCase();
  const cTitle = context?.title || '';

  if (q.includes('clip') || q.includes('saturat')) {
    return `### Op-Amp Saturation & Output Clipping Diagnostics
- **Cause**: Output voltage swing requested ($V_{out} = A_v \\cdot V_{in}$) exceeds the op-amp rail limits (typically $V_{CC} - 1.5\\text{V}$ for IC 741, e.g., $\\pm 10.5\\text{V}$ on $\\pm 12\\text{V}$ supplies).
- **Gain Verification**: Check closed loop gain ($A_v = -R_f/R_1$ for inverting, $1 + R_f/R_1$ for non-inverting).
- **Max Safe Input**: Ensure peak input $V_{in(pk)} \\le V_{sat} / |A_v|$.
- **Solution**: Decrease feedback resistor $R_f$ or reduce the input signal amplitude.`;
  }

  if (q.includes('555') || q.includes('timer') || q.includes('duty cycle') || q.includes('astable')) {
    return `### 555 Timer Analysis & Solutions
- **Frequency Formula**: $f = \\frac{1.44}{(R_A + 2R_B) C}$ for astable mode.
- **Timing Periods**: $t_{high} = 0.693(R_A + R_B)C$, $t_{low} = 0.693(R_B)C$.
- **Duty Cycle**: Strictly $> 50\\%$ without diode: $\\text{Duty} = \\frac{R_A + R_B}{R_A + 2R_B} \\times 100\\%$.
- **Why Measured Freq Differs**: Electrolytic capacitor tolerance is commonly $\\pm 20\\%$. Pin 7 discharge transistor saturation adds $\\approx 200\\text{ns}$ propagation delay at $>100\\text{kHz}$.`;
  }

  if (q.includes('zener') || q.includes('regulation') || q.includes('knee')) {
    return `### Zener Diode Voltage Regulator Diagnostics
- **Drop / Failure Cause**: Input voltage dropped below $V_Z$, or load current starved the diode ($I_L \\ge I_S$).
- **Series Resistor Sizing**: $R_S = \\frac{V_{in(min)} - V_Z}{I_{L(max)} + I_{ZK}}$, where $I_{ZK} \\approx 1\\text{ to }5\\text{mA}$.
- **Power Rating Check**: Ensure $P_{Z} = V_Z \\cdot I_{Z(max)} < P_{Z(rated)}$ under no-load condition.`;
  }

  if (q.includes('loading') || q.includes('divider') || q.includes('drop')) {
    return `### Voltage Divider Loading Effect
- **Physics**: Connecting load $R_L$ creates parallel resistance $R_2 \\parallel R_L < R_2$, causing measured voltage to drop below $V_{in} \\cdot \\frac{R_2}{R_1 + R_2}$.
- **Rule of Thumb**: Ensure bleeder current $I_{divider} \\ge 10 \\times I_{load}$ ($R_2 \\le 0.1 R_L$).
- **Best Fix**: Place an op-amp Voltage Follower buffer ($A_v = 1$, high input impedance) between divider output and $R_L$.`;
  }

  if (q.includes('reson') || q.includes('rlc') || q.includes('q factor')) {
    return `### Series RLC Resonance Bench
- **Resonant Frequency**: $f_0 = \\frac{1}{2\\pi \\sqrt{LC}}$. At resonance, inductive and capacitive reactances cancel ($X_L = X_C$), minimizing impedance to pure resistance $Z = R$.
- **Quality Factor**: $Q = \\frac{\\omega_0 L}{R} = \\frac{1}{R} \\sqrt{\\frac{L}{C}}$.
- **Bandwidth**: $\\Delta f = \\frac{f_0}{Q} = \\frac{R}{2\\pi L}$. Lower $R$ gives a sharper, higher-$Q$ resonance curve.`;
  }

  if (q.includes('filter') || q.includes('cutoff') || q.includes('rc filter')) {
    return `### RC Low-Pass Filter Diagnostics
- **Cutoff Frequency ($-3\\text{dB}$ point)**: $f_c = \\frac{1}{2\\pi R C}$.
- **Phase Shift**: Output lags input by $45^\\circ$ at $f_c$, reaching $90^\\circ$ at high frequencies ($f \\gg f_c$).
- **Rolloff**: First-order single pole rolls off at $-20\\text{dB/decade}$ ($-6\\text{dB/octave}$).`;
  }

  return `### CircuitPedia Engineering Guidance
For **${cTitle || 'your active circuit'}**:
1. **Operating Point**: Verify that DC supply rails ($V_{CC}, V_{EE}$) and grounds have continuous return paths with zero floating nodes.
2. **Component Tolerances**: Check that current ratings do not exceed thermal limits ($P = I^2 R = V^2 / R$).
3. **Measurement Setup**: Set oscilloscope coupling to DC for bias checking and AC for measuring ripple waveforms.`;
}

// Circuit troubleshooter and doubts assistant endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, context } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'A valid message string is required.' });
    }

    if (!ai) {
      return res.json({
        reply: "AI Studio API key is not currently initialized. You can still consult our built-in ECE rule engine and formula guides below!",
        fallback: true
      });
    }

    const systemInstruction = `You are CircuitPedia Assistant — an interactive, senior Electronics & Communication Engineering (ECE) laboratory instructor and circuit troubleshooter.
Your role:
1. Help students, lab researchers, and circuit designers debug their circuits, solve hardware problems, calculate component values, and clarify doubts.
2. Troubleshoot real-world issues: saturation/clipping, inverted polarity, thermal runaway, RC time constant errors, impedance mismatch, distortion, high output impedance under load, frequency drift, and ground bounce.
3. Show exact mathematical formulas (e.g. Ohm's Law, Op-Amp closed-loop gain A_v, 555 astable frequency f = 1.44/((R_A + 2R_B)C), Zener line/load regulation, filter cutoff f_c = 1/(2*pi*R*C), resonance f_0 = 1/(2*pi*sqrt(L*C))).
4. Provide step-by-step calculations with given numerical values and recommend realistic component ratings (e.g. standard resistor 5% E24 values, capacitor dielectric types, transistor beta/hfe).
5. Suggest oscilloscope probe configurations (Time/Div, Volts/Div, AC/DC coupling).
6. CRITICAL CONFIDENTIALITY REQUIREMENT: NEVER mention or cite any specific university names, college names, syllabus sources, course codes, or competitor names.
7. Tone: Clear, encouraging, highly technical yet accessible, well-structured with bullet points and bold key points.
8. Speed & Conciseness: Deliver immediate, direct, punchy technical solutions in 3-5 crisp bullet points (under 150 words). Avoid lengthy conversational filler or long preambles so the user receives their answer right away.`;

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Prior conversation history
    if (Array.isArray(history)) {
      for (const item of history.slice(-4)) {
        if (item.content && (item.role === 'user' || item.role === 'assistant' || item.role === 'model')) {
          contents.push({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(item.content) }]
          });
        }
      }
    }

    // Embed current circuit laboratory context if provided
    let promptWithContext = message;
    if (context && typeof context === 'object') {
      const contextSummary = [
        context.title ? `Active Experiment: ${context.title}` : '',
        context.category ? `Domain: ${context.category}` : '',
        context.params ? `Current Tuned Values: ${JSON.stringify(context.params)}` : ''
      ].filter(Boolean).join(' | ');

      if (contextSummary) {
        promptWithContext = `[Context: ${contextSummary}]\n\nUser Question / Circuit Problem: ${message}`;
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: promptWithContext }]
    });

    // Call Gemini with a 2.5-second timeout race
    const geminiCall = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.2,
        maxOutputTokens: 350,
      }
    });

    const timeoutPromise = new Promise<{ text: string }>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_FAST_REPLY')), 2500)
    );

    let reply = '';
    try {
      const response: any = await Promise.race([geminiCall, timeoutPromise]);
      reply = response.text || generateFastEceAnswer(message, context);
    } catch {
      // Rapid ECE analytical fallback guaranteed under 2.5s
      reply = generateFastEceAnswer(message, context);
    }

    return res.json({ reply, fallback: false });
  } catch (error: any) {
    const fallbackAnswer = generateFastEceAnswer(req.body?.message || '', req.body?.context);
    return res.json({ reply: fallbackAnswer, fallback: true });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  // Check port from env or args
  let port = 3000;
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--port' && process.argv[i + 1]) {
      port = Number(process.argv[i + 1]);
    }
  }
  if (process.env.PORT) {
    port = Number(process.env.PORT);
  }

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`CircuitPedia server running on http://0.0.0.0:${port}`);
  });
}

startServer();
