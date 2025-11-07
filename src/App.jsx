import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import "./App.css";

/** CHANGE THIS to your Worker URL after you deploy it */
const SUGGEST_ENDPOINT = "https://<your-worker-subdomain>.workers.dev/suggest";

const DEFAULTS = {
  text: "",
  size: 320,
  margin: 2,
  level: "Q", // L, M, Q, H
  dark: "#CFAE6D", // luxury gold-ish
  light: "#0B0F14", // deep midnight
  type: "image/png", // png | image/svg+xml
};

export default function App() {
  const [text, setText] = useState(DEFAULTS.text);
  const [prompt, setPrompt] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [size, setSize] = useState(DEFAULTS.size);
  const [margin, setMargin] = useState(DEFAULTS.margin);
  const [level, setLevel] = useState(DEFAULTS.level);
  const [dark, setDark] = useState(DEFAULTS.dark);
  const [light, setLight] = useState(DEFAULTS.light);
  const [type, setType] = useState(DEFAULTS.type);
  const [dataUrl, setDataUrl] = useState("");
  const canvasRef = useRef(null);

  // generate QR whenever inputs change
  useEffect(() => {
    const opts = {
      errorCorrectionLevel: level,
      margin,
      color: { dark, light },
      width: size,
    };

    if (!text && type !== "image/svg+xml") {
      // clear the canvas when empty
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, size, size);
      setDataUrl("");
      return;
    }

    if (type === "image/svg+xml") {
      QRCode.toString(text || " ", { type: "svg", ...opts })
        .then((svg) => {
          setDataUrl("data:image/svg+xml;utf8," + encodeURIComponent(svg));
        })
        .catch(console.error);
    } else {
      QRCode.toCanvas(canvasRef.current, text || " ", opts, (err) => {
        if (err) return console.error(err);
        setDataUrl(canvasRef.current.toDataURL("image/png"));
      });
    }
  }, [text, size, margin, level, dark, light, type]);

  const handleSuggest = async () => {
    if (!prompt.trim()) return;
    setLoadingAI(true);
    try {
      const res = await fetch(SUGGEST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          // A gentle instruction for the model: produce *direct* QR payload.
          system:
            "You are a QR content assistant. Given a user intention, output the exact payload to encode. If it is a website, output the full https URL. If it is a phone number, output tel:+<digits>. For email, output mailto:someone@example.com. For Wi-Fi, output WIFI:T:WPA;S:<SSID>;P:<PASS>;; . For vCard, output a concise VCARD block. Output only the payload.",
        }),
      });
      const data = await res.json();
      if (data?.suggestion) setText(data.suggestion.trim());
    } catch (e) {
      alert("AI suggestion failed. Check your Worker URL.");
      console.error(e);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleClear = () => {
    setPrompt("");
    setText("");
    setDataUrl("");
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = type === "image/svg+xml" ? "qr.svg" : "qr.png";
    a.click();
  };

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <div className="dot" />
          <h1>LuxQR</h1>
        </div>
        <p className="tag">Elegant, smart QR generator.</p>
      </header>

      <main className="card">
        <section className="controls">
          <div className="control">
            <label>AI helper (optional)</label>
            <div className="row">
              <input
                placeholder="Describe what you want (e.g., 'Wi-Fi HomeNet pass 12345678', 'link to https://mybrand.com', 'vCard for John')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <button disabled={loadingAI} onClick={handleSuggest}>
                {loadingAI ? "Thinking…" : "Suggest"}
              </button>
            </div>
            <small className="hint">
              AI returns a ready-to-encode payload. You can still edit it below.
            </small>
          </div>

          <div className="control">
            <label>QR content</label>
            <textarea
              rows={4}
              placeholder="Type or paste the exact text/URL/QR payload here"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="row">
              <button className="ghost" onClick={handleClear}>
                Clear
              </button>
            </div>
          </div>

          <div className="grid">
            <div className="control">
              <label>Size</label>
              <input
                type="number"
                min="128"
                max="1024"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              />
            </div>
            <div className="control">
              <label>Margin</label>
              <input
                type="number"
                min="0"
                max="10"
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
              />
            </div>
            <div className="control">
              <label>Error correction</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)}>
                <option>L</option>
                <option>M</option>
                <option>Q</option>
                <option>H</option>
              </select>
            </div>
            <div className="control">
              <label>Foreground</label>
              <input type="color" value={dark} onChange={(e) => setDark(e.target.value)} />
            </div>
            <div className="control">
              <label>Background</label>
              <input type="color" value={light} onChange={(e) => setLight(e.target.value)} />
            </div>
            <div className="control">
              <label>Format</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="image/png">PNG</option>
                <option value="image/svg+xml">SVG</option>
              </select>
            </div>
          </div>
        </section>

        <section className="preview">
          <div className="qr">
            {type === "image/svg+xml" ? (
              dataUrl ? <img src={dataUrl} alt="QR" /> : <div className="placeholder" />
            ) : (
              <canvas ref={canvasRef} width={size} height={size} />
            )}
          </div>
          <button className="primary" disabled={!text} onClick={handleDownload}>
            Download {type === "image/svg+xml" ? "SVG" : "PNG"}
          </button>
        </section>
      </main>

      <footer className="foot">
        <small>© {new Date().getFullYear()} LuxQR — React + Vite + Gemini helper.</small>
      </footer>
    </div>
  );
}
