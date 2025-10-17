import React, { useEffect, useRef, useState } from 'react'
import { marked } from 'marked'

type Msg = { role: 'user'|'assistant', content: string }
type Knowledge = any

const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function App(){
  const [knowledge, setKnowledge] = useState<Knowledge|null>(null)
  const [showChat, setShowChat] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [flow, setFlow] = useState<{ step:number, subIndex:number, data:any }>({ step: 0, subIndex: 0, data: {} })
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{ fetch(`${API_BASE}/knowledge`).then(r=>r.json()).then(setKnowledge).catch(()=>{}) },[])
  useEffect(()=>{ messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight }) },[messages])

  const addBot = (content:string)=> setMessages(m=>[...m, {role:'assistant', content}])
  const addUser = (content:string)=> setMessages(m=>[...m, {role:'user', content}])

  const startGuided = ()=>{
    setShowChat(true)
    setFlow({ step: 1, subIndex: 0, data: {} })
    addBot("Super! Ich begleite dich Schritt für Schritt. Zuerst: Möchtest du die Fotobox 📱 ohne Druck (digital) nutzen oder 🖨️ mit Sofortdruck?")
  }
  const startFree = ()=>{ setShowChat(true); addBot("Alles klar! Was möchtest du zur Fotobox wissen?") }

  async function askLLM(userText?: string){
    const payload = { messages: [
      ...messages.map(m=> ({ role: m.role==='assistant'?'assistant':'user', content: m.content })),
      ...(userText ? [{ role: 'user', content: userText }] : [])
    ]}
    const r = await fetch(`${API_BASE}/api/chat`,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    const j = await r.json()
    if(j.reply) addBot(j.reply); if(j.error) addBot("Fehler: "+j.error)
  }

  function buildSummary(data:any){
    const items:string[] = []
    items.push(`Modus: ${data.mode==='digital'?'Digital (Fobi Smart, digitale Nutzung immer inkl.)':'Sofortdruck'}`)
    if(data.guests) items.push(`Gäste: ${data.guests} (${data.print_recommendation||''})`)
    if(data.format) items.push(`Druckformat: ${data.format}`)
    if(data.high_volume) items.push(`Hohe Druckmengen: ${data.high_volume}`)
    const chosen:string[] = []
    if(data.requisiten) chosen.push('Requisiten')
    if(data.hintergrund) chosen.push('Hintergrund')
    if(data.layout) chosen.push('Individuelles Layout')
    if(chosen.length) items.push('Zubehör: '+chosen.join(', '))
    items.push(`Lieferung: 20 km um Kiel inklusive`)
    return "• "+items.filter(Boolean).join("\n• ")
  }

  function onFlowChoice(choice:string){
    const k = knowledge
    const st = flow.step
    const data = { ...flow.data }

    if(st===1){
      data.mode = choice.includes("Ohne") ? "digital" : "druck"
      setFlow({ step: data.mode==='digital' ? 5 : 2, subIndex: 0, data })
      if(data.mode==='digital'){
        addBot("Top! Digital mit der Fobi Smart bedeutet unbegrenzte Fotos, Online‑Galerie & QR‑Codes – nachhaltig und flexibel. Lass uns Zubehör wählen.")
        startSubstep()
      } else {
        addBot("Alles klar – mit Sofortdruck. Wie viele Gäste erwartet ihr etwa?")
      }
      return
    }

    if(st===2){
      data.guests = choice
      const rec = k?.button_flow?.steps?.[1]?.recommendations?.[choice] || ""
      data.print_recommendation = rec
      addBot(`Danke! Empfehlung: ${rec}. Als Nächstes: Welches Druckformat bevorzugst du?`)
      setFlow({ step: 3, subIndex: 0, data })
      return
    }

    if(st===3){
      data.format = choice.includes("Postkarten") ? "10x15" : "5x15"
      if(data.format==='5x15'){
        addBot("Hinweis: Mit 200 Prints (10×15) erhältst du 400 Fotostreifen, mit 400 Prints entsprechend 800 – ideal für 100–250 Gäste.")
      }
      setFlow({ step: 4, subIndex: 0, data })
      addBot("Planst du mehr als 400 Prints? Falls ja: Option A) zweites Media‑Kit (Selbstwechsel) oder B) zweites Drucksystem (Printpaket 802). Wenn nein, sag einfach 'nein'.")
      return
    }

    if(st===4){
      const c = choice.toLowerCase()
      data.high_volume = c.includes('b') ? 'zweites Drucksystem' : (c.includes('a') ? 'zweites Media‑Kit' : 'keine höhere Menge')
      setFlow({ step: 5, subIndex: 0, data })
      startSubstep()
      return
    }

    if(st===5){
      // Zubehör Substeps: requisiten -> hintergrund -> layout
      const substeps = k?.button_flow?.steps?.[4]?.substeps || []
      const current = substeps[flow.subIndex]
      if(current){
        const yes = choice.startsWith("✅")
        if(current.key==="requisiten"){
          data.requisiten = yes
          if(yes) addBot("Super, ich merke Requisiten als Zubehörpaket vor. Das konkrete Themenpaket stimmen wir im Planungsgespräch ab.")
        }
        if(current.key==="hintergrund"){
          data.hintergrund = yes
          if(yes) addBot("Super, ich merke dir das Hintergrundsystem vor. Motiv wählen wir im Planungsgespräch passend zum Layout.")
        }
        if(current.key==="layout"){
          data.layout = yes
          if(yes) addBot("Perfekt, ich merke die individuelle Layout-Gestaltung als Zubehörpaket vor. Du erhältst vorab eine Layoutvorschau zur Freigabe.")
          else addBot("Alles klar, dann verwende ich ein schlichtes Basic‑Layout (weiß, mit einfachem Text).")
        }
      }
      const nextIndex = flow.subIndex + 1
      if(nextIndex < substeps.length){
        setFlow({ step: 5, subIndex: nextIndex, data })
        presentSubstep(nextIndex)
      } else {
        setFlow({ step: 6, subIndex: 0, data })
        const summary = buildSummary(data)
        addBot("Kurzfassung deiner Auswahl:\n" + summary + "\nIch stelle dir jetzt eine transparente Preisübersicht zusammen …")
        askLLM("Bitte gib eine transparente Preisübersicht NUR JETZT am Ende. Kontext:\n"+summary)
      }
      return
    }
  }

  function startSubstep(){
    presentSubstep(0)
  }
  function presentSubstep(index:number){
    const s = knowledge?.button_flow?.steps?.[4]?.substeps?.[index]
    if(!s) return
    let text = ""
    if(s.key==='requisiten'){
      text = "Zu unseren Fotoboxen kannst du Requisiten dazubuchen. Damit sind verschiedene Accessoires und Themen‑Sets gemeint (z. B. Party, Maritim, Gatsby, Sommer, Weihnachten, Halloween, Oktoberfest). Die genaue Auswahl treffen wir im Planungsgespräch."
    } else if(s.key==='hintergrund'){
      text = "Ich empfehle in der Regel, einen Hintergrund zu nutzen, besonders wenn es keine schlichte Wand gibt. Die Leinwand ist ca. 2,5×2,5 m – 8–10 Personen passen gut aufs Bild. Es gibt Uni‑Farben, Holz, Blumen, Glitzer und Disco/Party‑Backdrops."
    } else if(s.key==='layout'){
      text = "Bei der individuellen Layout‑Gestaltung passe ich das Druckdesign an eure Wünsche/CI an (Schriften, Farben, Anordnung, 1–4 Fotos) inkl. Layoutvorschau. Kosten: 30 €; zweites darauf basierendes Layout +20 €."
    }
    addBot(text)
  }

  async function send(){
    if(!input.trim()) return
    const text = input.trim()
    setInput('')
    addUser(text)
    await askLLM(text)
  }

  return (
    <div className="wrap">
      <header>
        <h1>Dennis · KI‑Beratung</h1>
        <p className="sub">Dein digitaler Berater für die passende Fotobox.</p>
      </header>

      {!showChat && (
        <section className="card">
          <h2>Datenschutzhinweis</h2>
          <p>{knowledge?.privacy_notice || 'Hinweis: Bitte keine personenbezogenen Daten eingeben.'}</p>
          <div className="buttons">
            <button className="primary" onClick={startGuided}>Fotobox‑Beratung starten</button>
            <button onClick={startFree}>Ich habe eine konkrete Frage</button>
          </div>
          <p className="small">Du kannst auch jederzeit frei tippen – Dennis reagiert sofort auf deinen Text.</p>
        </section>
      )}

      <section className={"card "+(showChat?'':'hidden')}>
        <div className="messages" ref={messagesRef}>
          {messages.map((m,i)=>(
            <div key={i} className={"msg "+(m.role==='assistant'?'bot':'user')} dangerouslySetInnerHTML={{__html: marked.parse(m.content)}} />
          ))}
        </div>

        {/* Flow controls */}
        {flow.step>0 && (
          <div className="flow">
            {flow.step===1 && (
              <div className="flow-buttons">
                <button onClick={()=>onFlowChoice('📱 Ohne Druck (digital)')}>📱 Ohne Druck (digital)</button>
                <button onClick={()=>onFlowChoice('🖨️ Mit Druck (Sofortdruck)')}>🖨️ Mit Druck (Sofortdruck)</button>
              </div>
            )}
            {flow.step===2 && (
              <div className="flow-buttons">
                <button onClick={()=>onFlowChoice('Bis 50 Personen')}>Bis 50 Personen</button>
                <button onClick={()=>onFlowChoice('50–120 Personen')}>50–120 Personen</button>
                <button onClick={()=>onFlowChoice('Ab 120 Personen')}>Ab 120 Personen</button>
              </div>
            )}
            {flow.step===3 && (
              <div className="flow-buttons">
                <button onClick={()=>onFlowChoice('📸 Postkartenformat (10×15 cm)')}>📸 Postkartenformat (10×15 cm)</button>
                <button onClick={()=>onFlowChoice('🎞️ Fotostreifen (5×15 cm)')}>🎞️ Fotostreifen (5×15 cm)</button>
              </div>
            )}
            {flow.step===4 && (
              <div className="flow-buttons">
                <button onClick={()=>onFlowChoice('Option A')}>Option A: zweites Media‑Kit</button>
                <button onClick={()=>onFlowChoice('Option B')}>Option B: zweites Drucksystem (Printpaket 802)</button>
                <button onClick={()=>onFlowChoice('nein')}>Nein, max. 400 Prints</button>
              </div>
            )}
            {flow.step===5 && (
              <div className="flow-buttons">
                <button onClick={()=>onFlowChoice('✅ Ja')}>✅ Ja</button>
                <button onClick={()=>onFlowChoice('❌ Nein')}>❌ Nein</button>
              </div>
            )}
            {flow.step===6 && (
              <div className="tag">Preise werden jetzt transparent genannt.</div>
            )}
          </div>
        )}

        <div className="composer">
          <textarea value={input} onChange={(e)=>setInput(e.target.value)} placeholder="Schreibe hier deine Nachricht … (Enter zum Senden)"
            onKeyDown={(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); }}} />
          <button className="primary" onClick={send}>Senden</button>
        </div>
      </section>

      <footer className="small">
        DSGVO‑freundlich · Keine personenbezogenen Daten · Lieferung 20 km um Kiel inklusive
      </footer>
    </div>
  )
}
