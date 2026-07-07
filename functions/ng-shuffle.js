// ng-shuffle.js
// Picks scaffold stages from the full practiced/controlled pool
// Difficulty controls which stage text appears
// Evaluates free-form production combining all patterns

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'
    const body=JSON.parse(event.body||'{}')
    const{count=5,difficulty='easy',coherent=true,action='generate',answer='',words=[]}=body

    const stageIndex={easy:0,med:1,hard:2}[difficulty]||0

    if(action==='generate'){
      const[{data:profile},{data:allEvents},{data:scaffolds}]=await Promise.all([
        sb.from('ng_learner_profile').select('frontier,controlled,phase').eq('user_id',UID).single(),
        sb.from('ng_scaffold_events').select('scaffold_id,stage').eq('user_id',UID),
        sb.from('ng_scaffolds').select('id,base_portuguese,base_english,stages,category,context,phase').eq('user_id',UID)
      ])

      const phase=profile?.phase||1
      const controlled=new Set((profile?.controlled||[]).map(c=>c.scaffold_id+'|'+c.stage))
      const frontierIds=new Set((profile?.frontier||[]).map(f=>f.scaffold_id))

      // Build pool: scaffolds with any practiced stage OR controlled OR in frontier
      const practicedScaffolds=new Set((allEvents||[]).map(e=>e.scaffold_id))
      const controlledSet=controlled // already defined above
      const eligiblePool=(scaffolds||[]).filter(s=>
        practicedScaffolds.has(s.id)||frontierIds.has(s.id)||
        (profile?.controlled||[]).some(c=>c.scaffold_id===s.id)
      )

      if(!eligiblePool.length){
        return{statusCode:200,body:JSON.stringify({
          ok:false,
          error:'No practiced patterns yet. Do a few Study or Phrase sessions first.'
        })}
      }

      // Easy fallback: if no controlled stages, use frontier Stage 1
      const hasControlled=controlled.size>0

      // Shuffle pool and pick based on coherent/random mode
      const shuffled=[...eligiblePool].sort(()=>Math.random()-0.5)
      const picked=[]
      const usedCats=new Set()
      // For coherent mode: pick a dominant category first, then filter
      // For coherent mode: find the category with most eligible scaffolds
      const catFreq={}
      eligiblePool.forEach(s=>{catFreq[s.category]=(catFreq[s.category]||0)+1})
      const dominantCat=coherent
        ?(Object.entries(catFreq).sort(([,a],[,b])=>b-a)[0]?.[0]||null)
        :null

      for(const sc of shuffled){
        if(picked.length>=count)break
        if(coherent&&dominantCat&&sc.category!==dominantCat&&picked.length<Math.ceil(count*0.7))continue
        if(!usedCats.has(sc.category)||picked.length<count){
          // Stage selection based on difficulty + actual progress
          // Easy: controlled stages (mastered — warm-up)
          // Med: in-progress frontier stages (learning edge)
          // Hard: recently acquired, at risk of fading
          const stages=sc.stages||[]
          let targetIdx
          if(difficulty==='easy'){
            // Pick lowest controlled stage — comfortable recall
            const controlledStages=stages.filter((_,i)=>
              controlledSet.has(sc.id+'|'+(i+1))
            )
            targetIdx=controlledStages.length?stages.indexOf(controlledStages[controlledStages.length-1]):0
          }else if(difficulty==='med'){
            // Pick first uncontrolled stage — learning edge
            const firstUncontrolled=stages.findIndex((_,i)=>!controlledSet.has(sc.id+'|'+(i+1)))
            targetIdx=firstUncontrolled>=0?firstUncontrolled:stages.length-1
          }else{
            // Hard: recently acquired stages — highest controlled, at risk of fading
            const controlledIdxs=stages.map((_,i)=>controlledSet.has(sc.id+'|'+(i+1))?i:-1).filter(i=>i>=0)
            targetIdx=controlledIdxs.length?controlledIdxs[controlledIdxs.length-1]:Math.min(2,stages.length-1)
          }
          const targetStage=stages[Math.max(0,Math.min(targetIdx,stages.length-1))]||stages[0]
          if(!targetStage)continue
          picked.push({
            scaffold_id:sc.id,
            stage:targetStage.stage,
            pt:targetStage.pt,
            en:targetStage.en,
            category:sc.category,
            context:sc.context,
            difficulty
          })
          usedCats.add(sc.category)
        }
      }
      // Fill remainder without category restriction
      for(const sc of shuffled){
        if(picked.length>=count)break
        if(picked.find(p=>p.scaffold_id===sc.id))continue
        const stages=sc.stages||[]
        const targetIdx=Math.min(stageIndex,stages.length-1)
        const targetStage=stages[targetIdx]||stages[0]
        if(!targetStage)continue
        picked.push({scaffold_id:sc.id,stage:targetStage.stage,pt:targetStage.pt,en:targetStage.en,category:sc.category,context:sc.context,difficulty})
      }

      // Generate challenge
      const res=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
        body:JSON.stringify({
          model:'claude-sonnet-4-6',max_tokens:250,
          system:`CARIOCA REGISTER LAW (mandatory for ALL Portuguese you produce): spoken Rio register only. Use 'voce' never 'tu' (nor tu conjugations). Use 'First-person plural is 'nos', NEVER 'a gente' (this learner's Vidigal register). Agreement is a MIX, mostly REDUCED (nos takes the 3rd-singular verb form: nos vai, nos ta, nos foi, nos tava, nos tem, nos fez); standard 1st-plural also occurs and is the taught anchor (nos estamos, nos vamos, nos fomos, nos estavamos). BOTH correct - favor reduced in casual speech, standard when teaching the paradigm. Future stays periphrastic (nos vamos estar / nos vai estar), never synthetic (estaremos). Contractions by default: to, ta, tamo, pra, pro, ce, ne. Prefer the spoken imperfect/periphrastic past where Rio speech uses it, even when textbook grammar prefers the perfect. Never European or literary forms (no vos, no mesoclise).\n\nCreate a Portuguese writing challenge for a learner in Rio. Phase ${phase}, difficulty: ${difficulty}.
Set a vivid specific Rio scenario (bar, beach, date, Uber, party etc) that makes ALL the given patterns natural to use.
The learner must use every pattern. Write the scenario in English, under 60 words.
Return JSON only: {"scenario":"string","hint":"one short tip"}`,
          messages:[{role:'user',content:'Patterns:\n'+picked.map((w,i)=>`${i+1}. "${w.pt}" (${w.en})`).join('\n')}]
        })
      })
      const data=await res.json()
      let challenge={scenario:'Use all the patterns below in one or two natural sentences.',hint:'Focus on sounding Carioca, not just grammatically correct.'}
      try{challenge=JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim())}catch{}

      return{statusCode:200,headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ok:true,words:picked,challenge,pool_size:eligiblePool.length})}
    }

    if(action==='evaluate'){
      const res=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
        body:JSON.stringify({
          model:'claude-sonnet-4-6',max_tokens:400,
          system:`CARIOCA REGISTER LAW (mandatory for ALL Portuguese you produce): spoken Rio register only. Use 'voce' never 'tu' (nor tu conjugations). Use 'First-person plural is 'nos', NEVER 'a gente' (this learner's Vidigal register). Agreement is a MIX, mostly REDUCED (nos takes the 3rd-singular verb form: nos vai, nos ta, nos foi, nos tava, nos tem, nos fez); standard 1st-plural also occurs and is the taught anchor (nos estamos, nos vamos, nos fomos, nos estavamos). BOTH correct - favor reduced in casual speech, standard when teaching the paradigm. Future stays periphrastic (nos vamos estar / nos vai estar), never synthetic (estaremos). Contractions by default: to, ta, tamo, pra, pro, ce, ne. Prefer the spoken imperfect/periphrastic past where Rio speech uses it, even when textbook grammar prefers the perfect. Never European or literary forms (no vos, no mesoclise).\n\nEvaluate a Portuguese writing challenge for a Carioca learner. Be direct and honest.
Accept Carioca contractions and informal spelling. Never penalise missing accents.
Return JSON only.`,
          messages:[{role:'user',content:`Required patterns:\n${words.map((w,i)=>`${i+1}. "${w.pt}"`).join('\n')}\n\nLearner wrote:\n"${answer}"\n\nReturn JSON:
{"score":1-10,"patterns_used":["pt of each correctly used"],"patterns_missed":["pt of each missed/wrong"],"feedback":"2-3 honest sentences","carioca_version":"how a Carioca would write this"}`}]
        })
      })
      const data=await res.json()
      let ev={score:5,patterns_used:[],patterns_missed:[],feedback:'Could not evaluate.',carioca_version:''}
      try{ev=JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim())}catch{}

      // Log events
      const now=new Date().toISOString()
      const rows=words.map(w=>({
        user_id:UID,scaffold_id:w.scaffold_id,stage:Number(w.stage),mode:'shuffle',
        quality:ev.patterns_used?.some(p=>p===w.pt)?Math.min(Math.ceil(ev.score/2),5):2,
        produced:ev.patterns_used?.some(p=>p===w.pt)||false,
        created_at:now
      })).filter(r=>r.scaffold_id)
      if(rows.length)await sb.from('ng_scaffold_events').insert(rows).catch(e=>console.log('Events:',e.message))

      // Run acquisition check via ng-session-end (events already inserted)
      if(rows.length){
        try{
          const siteUrl=process.env.URL||process.env.DEPLOY_URL||''
          if(siteUrl){
            fetch(`${siteUrl}/.netlify/functions/ng-session-end`,{
              method:'POST',headers:{'Content-Type':'application/json'},
              body:JSON.stringify({mode:'shuffle',events:rows,skip_insert:true,duration_seconds:rows.length*30})
            }).catch(()=>{})
          }
        }catch(_){}
      }

      return{statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify({ok:true,...ev,events_logged:rows.length})}
    }

    return{statusCode:400,body:JSON.stringify({error:'Unknown action'})}
  }catch(e){
    console.error('ng-shuffle:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
