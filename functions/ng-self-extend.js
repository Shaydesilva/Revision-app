// ng-self-extend.js
// Generates Stage N+1 when Stage N is acquired
// Called async from ng-session-end — never blocks the user
// Persisted forever — never regenerated

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'

    const{scaffold_id}=JSON.parse(event.body||'{}')
    if(!scaffold_id)return{statusCode:400,body:JSON.stringify({error:'No scaffold_id'})}

    // Load the scaffold
    const{data:scaffold}=await sb
      .from('ng_scaffolds')
      .select('*')
      .eq('id',scaffold_id)
      .eq('user_id',UID)
      .single()

    if(!scaffold)return{statusCode:404,body:JSON.stringify({error:'Scaffold not found'})}

    const stages=scaffold.stages||[]
    const lastStage=stages[stages.length-1]

    // Check if a generated stage already exists — never generate twice
    const alreadyGenerated=stages.some(s=>s.generated)
    if(alreadyGenerated){
      return{statusCode:200,body:JSON.stringify({ok:true,message:'Already extended'})}
    }

    // Load learner profile for context
    const{data:profile}=await sb
      .from('ng_learner_profile')
      .select('controlled,error_fingerprint,phase,luna_notes')
      .eq('user_id',UID)
      .single()

    const controlledCount=(profile?.controlled||[]).length
    const phase=profile?.phase||1

    // Build all existing stages for context
    const stagesText=stages.map(s=>`Stage ${s.stage}: "${s.pt}" (${s.en})`).join('\n')

    // Generate Stage N+1 with Claude
    const response=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-api-key':process.env.ANTHROPIC_API_KEY,
        'anthropic-version':'2023-06-01'
      },
      body:JSON.stringify({
        model:'claude-sonnet-4-6',
        max_tokens:300,
        system:`You generate the next stage of a Carioca Portuguese scaffold.
Rules:
- Must be a natural extension of the previous stage — same pattern, one element added
- Must sound like something a Carioca in Rio would actually say
- Keep it under 12 words
- Carioca register: use contractions (tô/tá/tamo), drop subjects where natural, use intensifiers
- Never formal Portuguese
- The extension should feel like levelling up — more natural, more expressive, more Carioca
- Return ONLY valid JSON, nothing else`,
        messages:[{
          role:'user',
          content:`Scaffold: "${scaffold.base_portuguese}" (${scaffold.base_english})
Context: ${scaffold.context}, Category: ${scaffold.category}, Phase: ${phase}

Existing stages:
${stagesText}

Learner has ${controlledCount} controlled stages. They are at Phase ${phase}.
${profile?.luna_notes?`Notes on this learner: ${profile.luna_notes}`:''}

Generate Stage ${stages.length+1} — the next natural extension.
Return JSON only:
{
  "pt": "the Portuguese stage",
  "en": "the English translation",
  "rationale": "one sentence on what this stage adds"
}`
        }]
      })
    })

    const data=await response.json()
    let generated=null
    try{
      const text=data.content?.[0]?.text||''
      const clean=text.replace(/```json|```/g,'').trim()
      generated=JSON.parse(clean)
    }catch{
      return{statusCode:500,body:JSON.stringify({error:'Failed to parse generated stage'})}
    }

    if(!generated?.pt){
      return{statusCode:500,body:JSON.stringify({error:'Invalid generated stage'})}
    }

    // Append new stage permanently — never regenerated
    const newStage={
      stage:stages.length+1,
      pt:generated.pt,
      en:generated.en,
      acquired:false,
      acquired_at:null,
      practice_count:0,
      modes_used:[],
      generated:true,                          // marks this as AI-generated
      generated_at:new Date().toISOString(),   // audit trail
      rationale:generated.rationale
    }

    const updatedStages=[...stages,newStage]

    const{error:updateErr}=await sb
      .from('ng_scaffolds')
      .update({stages:updatedStages})
      .eq('id',scaffold_id)
      .eq('user_id',UID)

    if(updateErr){
      return{statusCode:500,body:JSON.stringify({error:updateErr.message})}
    }

    // Log
    await sb.from('write_log').insert({
      user_id:UID,
      table_name:'ng_scaffolds',
      operation:'self_extend',
      status:'success',
      row_count:1
    }).catch(()=>{})

    return{
      statusCode:200,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        ok:true,
        scaffold_id,
        new_stage:newStage
      })
    }

  }catch(e){
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
