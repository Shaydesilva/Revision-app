// ng-import-scaffolds.js
// Detects scaffold bases and extensions from Victor's lesson notes
// Called after normal card import — adds/extends scaffolds automatically

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{notes='',newCards=[],previewOnly=false,approvedScaffolds=[]}=JSON.parse(event.body||'{}')

    // Handle writing pre-approved scaffolds
    if(approvedScaffolds.length){
      const{createClient}=require('@supabase/supabase-js')
      const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
      const UID='00000000-0000-0000-0000-000000000001'
      let added=0
      for(const sc of approvedScaffolds.slice(0,10)){
        if(!sc.base_portuguese||!sc.stages?.length){continue}
        const{error}=await sb.from('ng_scaffolds').insert({
          id:'sc_victor_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),
          user_id:UID,
          base_portuguese:sc.base_portuguese,
          base_english:sc.base_english||'',
          stages:sc.stages.map((s,i)=>({stage:i+1,pt:s.pt,en:s.en,acquired:false,acquired_at:null,practice_count:0,modes_used:[]})),
          current_stage:1,phase:sc.phase||1,category:sc.category||'social_foundation',
          context:sc.context||'general',cluster:'victor',source:'victor',last_practiced:null
        })
        if(!error)added++
      }
      return{statusCode:200,body:JSON.stringify({ok:true,added})}
    }
    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'

    // Load existing scaffolds to detect extensions
    const{data:existingScaffolds}=await sb
      .from('ng_scaffolds')
      .select('id,base_portuguese,stages,current_stage,source')
      .eq('user_id',UID)

    const scaffoldBases=new Map()
    ;(existingScaffolds||[]).forEach(s=>{scaffoldBases.set(s.base_portuguese.toLowerCase().trim(),s)})

    // Claude analyses Victor's notes for scaffold content
    const response=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({
        model:'claude-sonnet-4-6',
        max_tokens:1500,
        system:`You analyse Portuguese language lesson notes and identify scaffold patterns.
A scaffold is a conversational pattern that can be extended in stages.
Example: "bora" → "bora, tamo atrasado" → "bora logo que tamo atrasado"

Existing scaffold bases (don't duplicate these):
${Array.from(scaffoldBases.keys()).slice(0,50).join(', ')}

Return JSON only. No preamble.`,
        messages:[{
          role:'user',
          content:`Victor's lesson notes:
${notes}

New cards extracted: ${newCards.map(c=>c.portuguese).join(', ')}

Identify:
1. New scaffold bases (patterns that can be extended, not in existing list)
2. Extensions of existing scaffolds (when Victor builds on something already known)
3. Victor's explicit pattern examples (multi-word phrases he demonstrated)

Return JSON:
{
  "newScaffolds": [
    {
      "base_portuguese": "base form",
      "base_english": "translation",
      "context": "social|dating|restaurant|transport|general|bar|beach|gym",
      "category": "social_foundation|dating_register|personality_humour|deep_fluency",
      "stages": [
        {"stage":1,"pt":"base form","en":"translation"},
        {"stage":2,"pt":"natural extension","en":"translation"},
        {"stage":3,"pt":"fuller extension","en":"translation"},
        {"stage":4,"pt":"full Carioca version","en":"translation"}
      ]
    }
  ],
  "extensions": [
    {
      "matches_base": "existing base Portuguese exactly",
      "new_stage": {"stage":0,"pt":"extension Victor taught","en":"translation"}
    }
  ],
  "summary": "one sentence on what Victor covered today"
}`
        }]
      })
    })

    const data=await response.json()
    let analysis={newScaffolds:[],extensions:[],summary:''}
    try{
      const text=data.content?.[0]?.text||'{}'
      analysis=JSON.parse(text.replace(/```json|```/g,'').trim())
    }catch(e){
      return{statusCode:200,body:JSON.stringify({ok:true,newScaffolds:0,extensions:0,summary:'Could not parse scaffold analysis'})}
    }

    const results={newScaffolds:0,extensions:0,summary:analysis.summary||''}

    // If previewOnly, return suggestions without writing
    if(previewOnly){
      return{statusCode:200,body:JSON.stringify({
        ok:true,
        suggestions:[...(analysis.newScaffolds||[])],
        summary:analysis.summary||''
      })}
    }

    // Add new scaffolds
    for(const sc of(analysis.newScaffolds||[]).slice(0,10)){
      if(!sc.base_portuguese||!sc.stages?.length)continue
      // Check not duplicate
      if(scaffoldBases.has(sc.base_portuguese.toLowerCase().trim()))continue
      const stages=sc.stages.map((s,i)=>({
        stage:i+1,
        pt:s.pt,
        en:s.en,
        acquired:false,
        acquired_at:null,
        practice_count:0,
        modes_used:[]
      }))
      const{error}=await sb.from('ng_scaffolds').insert({
        id:`sc_victor_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        user_id:UID,
        base_portuguese:sc.base_portuguese,
        base_english:sc.base_english||'',
        stages,
        current_stage:1,
        phase:1,
        category:sc.category||'social_foundation',
        context:sc.context||'general',
        cluster:'victor',
        source:'victor',
        last_practiced:null
      })
      if(!error)results.newScaffolds++
    }

    // Add extensions to existing scaffolds
    for(const ext of(analysis.extensions||[]).slice(0,5)){
      if(!ext.matches_base||!ext.new_stage?.pt)continue
      const existing=scaffoldBases.get(ext.matches_base.toLowerCase().trim())
      if(!existing)continue
      const currentStages=existing.stages||[]
      // Only add if this stage doesn't already exist
      const maxStage=Math.max(...currentStages.map(s=>s.stage||0))
      const newStage={
        stage:maxStage+1,
        pt:ext.new_stage.pt,
        en:ext.new_stage.en||'',
        acquired:false,
        acquired_at:null,
        practice_count:0,
        modes_used:[],
        source:'victor',
        added_at:new Date().toISOString()
      }
      const{error}=await sb.from('ng_scaffolds')
        .update({stages:[...currentStages,newStage]})
        .eq('id',existing.id)
        .eq('user_id',UID)
      if(!error)results.extensions++
    }

    return{
      statusCode:200,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ok:true,...results})
    }
  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
