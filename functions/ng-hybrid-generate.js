// ng-hybrid-generate.js
// Daily hybrid scaffold generation — informed by full intelligence layer
// Chimera rule: is_hybrid:true, can_hybridize:false — terminal, no further reproduction

exports.handler=async(event)=>{
  if(event.httpMethod!=='POST')return{statusCode:405}
  try{
    const{createClient}=require('@supabase/supabase-js')
    const sb=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY)
    const UID='00000000-0000-0000-0000-000000000001'

    const[{data:profile},{data:scaffolds}]=await Promise.all([
      sb.from('ng_learner_profile').select('*').eq('user_id',UID).single(),
      sb.from('ng_scaffolds').select('id,base_portuguese,base_english,stages,phase,category,context,is_hybrid').eq('user_id',UID)
    ])

    const controlled=profile?.controlled||[]
    const metrics=profile?.metrics_snapshot||{}
    const struggles=profile?.struggle_patterns?.by_scaffold||{}
    const lunaNotes=profile?.luna_notes||''
    const errorFingerprint=profile?.error_fingerprint||{}

    // Find eligible scaffolds: all 4 stages controlled, not a hybrid
    const scaffoldControlled={}
    controlled.forEach(c=>{
      if(!scaffoldControlled[c.scaffold_id])scaffoldControlled[c.scaffold_id]=0
      scaffoldControlled[c.scaffold_id]++
    })
    const eligible=(scaffolds||[]).filter(s=>
      !s.is_hybrid&&
      scaffoldControlled[s.id]>=4
    )

    if(eligible.length<2){
      return{statusCode:200,body:JSON.stringify({ok:true,generated:0,reason:'Not enough controlled scaffolds yet'})}
    }

    // Group eligible by category to find natural pairings
    const byCat={}
    eligible.forEach(s=>{
      if(!byCat[s.category])byCat[s.category]=[]
      byCat[s.category].push(s)
    })

    // Pick up to 3 pairs that make sense to hybridise
    const pairs=[]
    Object.values(byCat).forEach(group=>{
      if(group.length>=2&&pairs.length<3){
        // Sort by struggle score (combine patterns the user finds hard)
        const sorted=[...group].sort((a,b)=>(struggles[b.id]||0)-(struggles[a.id]||0))
        pairs.push([sorted[0],sorted[1]])
      }
    })

    if(!pairs.length){
      // Cross-category pair as fallback
      const shuffled=[...eligible].sort(()=>Math.random()-0.5)
      pairs.push([shuffled[0],shuffled[1]])
    }

    // Build intelligence context for Claude
    const weakestCategory=metrics?.weakest_category||'unknown'
    const topStruggles=(metrics?.dont_know?.top_struggles||[]).map(s=>s.base).join(', ')
    const bestMode=metrics?.mode_breakdown?.best_mode||'study'

    const suggestions=[]
    for(const[a,b]of pairs){
      const res=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
        body:JSON.stringify({
          model:'claude-sonnet-4-6',max_tokens:600,
          system:`You create hybrid Carioca Portuguese scaffold patterns for a learner in Rio.
A hybrid combines two mastered patterns into a new richer expression that a Carioca would actually say.
The hybrid does NOT need to be word-for-word both patterns — it can use contractions, shortenings, or new words that emerge from the fusion.
Generate 6 stages that naturally escalate from the base fusion to a full expressive Carioca version.

LEARNER PROFILE:
Weakest area: ${weakestCategory}
Top struggles: ${topStruggles}
Best learning mode: ${bestMode}
Luna's notes: ${lunaNotes.slice(0,200)}
Known errors: ${Object.keys(errorFingerprint).slice(0,3).join(', ')}

The hybrid should address the learner's weak areas where possible while combining their mastered patterns.
Return JSON only.`,
          messages:[{role:'user',content:`Combine these two mastered patterns into a hybrid scaffold:

Pattern A: "${a.base_portuguese}" (${a.base_english}) — ${a.category}, ${a.context}
Pattern B: "${b.base_portuguese}" (${b.base_english}) — ${b.category}, ${b.context}

Return JSON:
{
  "base_portuguese": "the natural Carioca fusion base form",
  "base_english": "english translation",
  "category": "most fitting category",
  "context": "most fitting context",
  "reason": "why this fusion is natural and useful for a Carioca learner",
  "stages": [
    {"stage":1,"pt":"base fusion","en":"translation"},
    {"stage":2,"pt":"natural extension","en":"translation"},
    {"stage":3,"pt":"fuller expression","en":"translation"},
    {"stage":4,"pt":"with intensifier","en":"translation"},
    {"stage":5,"pt":"with additional colour","en":"translation"},
    {"stage":6,"pt":"full expressive Carioca form","en":"translation"}
  ]
}`}]
        })
      })
      const data=await res.json()
      try{
        const sc=JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim())
        if(sc.base_portuguese&&sc.stages?.length){
          suggestions.push({
            ...sc,
            parent_a:a.id,
            parent_b:b.id,
            parent_a_base:a.base_portuguese,
            parent_b_base:b.base_portuguese,
            is_hybrid:true,
            can_hybridize:false, // chimera rule — terminal
            phase:Math.min(a.phase,b.phase),
            generated_at:new Date().toISOString()
          })
        }
      }catch(e){console.log('Parse error:',e.message)}
    }

    // Store suggestions in profile.pending_hybrids for map notification
    const existing=profile?.pending_hybrids||[]
    const updated=[...existing,...suggestions].slice(0,10) // cap at 10 pending
    await sb.from('ng_learner_profile').update({
      pending_hybrids:updated,
      last_hybrid_date:new Date().toISOString().slice(0,10)
    }).eq('user_id',UID)

    console.log('ng-hybrid-generate: generated',suggestions.length,'suggestions')
    return{statusCode:200,body:JSON.stringify({ok:true,generated:suggestions.length,suggestions})}
  }catch(e){
    console.error('ng-hybrid-generate:',e.message)
    return{statusCode:500,body:JSON.stringify({error:e.message})}
  }
}
